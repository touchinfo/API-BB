/**
 * Serviço para interagir com a API do Banco do Brasil
 */
const axios = require('axios');
const config = require('../config');
const authService = require('./authService');
const certificateLoader = require('../utils/certificateLoader');

class BancoService {
    /**
     * Converte data para formato DDMMAAAA (formato exigido pela API BB)
     * @param {string} date - YYYY-MM-DD, DD.MM.YYYY ou DDMMAAAA
     * @returns {string} Data no formato DDMMAAAA
     */
    convertDateFormat(date) {
        if (!date) return null;
        if (/^\d{8}$/.test(date)) return date;
        
        if (date.includes('-')) {
            const [year, month, day] = date.split('-');
            return `${day}${month}${year}`;
        }
        
        if (date.includes('.')) {
            const [day, month, year] = date.split('.');
            return `${day}${month}${year}`;
        }
        
        return date;
    }

    buildUrl(path) {
        return `${config.bb.apiUrl}${path}?gw-dev-app-key=${config.bb.devAppKey}`;
    }

    addQueryParams(url, params) {
        const validParams = Object.entries(params)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        
        return validParams ? `${url}&${validParams}` : url;
    }

    async makeRequest(options) {
        const token = await authService.getToken();
        
        const response = await axios({
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            httpsAgent: certificateLoader.getAgent(),
            timeout: config.bb.timeout
        });
        
        return response.data;
    }

    /**
     * Consulta extrato de conta corrente
     * @param {string} agencia - Número da agência
     * @param {string} conta - Número da conta
     * @param {Object} options - Opções de filtro
     * @param {string} options.dataInicio - Data início (YYYY-MM-DD)
     * @param {string} options.dataFim - Data fim (YYYY-MM-DD)
     */
    async getExtrato(agencia, conta, options = {}) {
        console.log(`📊 Consultando extrato - Agência: ${agencia}, Conta: ${conta}`);
        
        try {
            const path = `/extratos/v1/conta-corrente/agencia/${agencia}/conta/${conta}`;
            let url = this.buildUrl(path);
            
            const dataInicioFormatted = this.convertDateFormat(options.dataInicio);
            const dataFimFormatted = this.convertDateFormat(options.dataFim);
            
            url = this.addQueryParams(url, {
                dataInicioSolicitacao: dataInicioFormatted,
                dataFimSolicitacao: dataFimFormatted
            });
            
            if (dataInicioFormatted || dataFimFormatted) {
                console.log(`   Período: ${dataInicioFormatted || 'N/A'} até ${dataFimFormatted || 'N/A'}`);
            }
            
            const data = await this.makeRequest({ method: 'GET', url });
            
            console.log(`✅ Extrato obtido - ${data.listaLancamento?.length || 0} lançamentos\n`);
            
            return data;
            
        } catch (error) {
            console.error(`❌ Erro ao consultar extrato: ${error.message}\n`);
            throw error;
        }
    }

    /**
     * Consulta saldo de conta corrente
     * Nota: Saldo é extraído do extrato (API BB não tem endpoint separado)
     * @param {string} agencia - Número da agência
     * @param {string} conta - Número da conta
     */
    async getSaldo(agencia, conta) {
        console.log(`💰 Consultando saldo - Agência: ${agencia}, Conta: ${conta}`);
        
        try {
            const extrato = await this.getExtrato(agencia, conta, {});
            
            const saldos = {
                saldoAnterior: null,
                saldoDoDia: null,
                saldoAtual: null,
                ultimoLancamento: null
            };
            
            const padroesSaldo = {
                saldoAnterior: /saldo anterior/i,
                saldoDoDia: /saldo do dia/i,
                saldoAtual: /saldo atual/i
            };
            
            if (extrato.listaLancamento && Array.isArray(extrato.listaLancamento)) {
                
                extrato.listaLancamento.forEach((lancamento, index) => {
                    const descricao = lancamento.textoDescricaoHistorico || '';
                    
                    for (const [tipo, padrao] of Object.entries(padroesSaldo)) {
                        if (padrao.test(descricao)) {
                            saldos[tipo] = {
                                valor: parseFloat(lancamento.valorLancamento),
                                sinal: lancamento.indicadorSinalLancamento,
                                data: lancamento.dataLancamento,
                                descricao: descricao
                            };
                        }
                    }
                    
                    if (index === extrato.listaLancamento.length - 1) {
                        saldos.ultimoLancamento = {
                            valor: parseFloat(lancamento.valorLancamento),
                            sinal: lancamento.indicadorSinalLancamento,
                            data: lancamento.dataLancamento,
                            descricao: descricao
                        };
                    }
                });
                
                if (saldos.saldoDoDia) {
                    saldos.saldoAtual = saldos.saldoDoDia;
                }
                
                // Cálculo de saldo se não encontrar descrições específicas
                if (!saldos.saldoAnterior && !saldos.saldoDoDia) {
                    let totalCredito = 0;
                    let totalDebito = 0;
                    let saldoInicial = 0;
                    
                    extrato.listaLancamento.forEach((lanc, idx) => {
                        const valor = parseFloat(lanc.valorLancamento) || 0;
                        const descricao = (lanc.textoDescricaoHistorico || '').toLowerCase();
                        
                        if (idx === 0 && descricao.includes('saldo')) {
                            saldoInicial = valor;
                            return;
                        }
                        
                        if (lanc.indicadorSinalLancamento === 'C') {
                            totalCredito += valor;
                        } else if (lanc.indicadorSinalLancamento === 'D') {
                            totalDebito += valor;
                        }
                    });
                    
                    const saldoCalculado = saldoInicial + totalCredito - totalDebito;
                    
                    saldos.saldoCalculado = {
                        valor: saldoCalculado,
                        saldoInicial: saldoInicial,
                        totalCredito: totalCredito,
                        totalDebito: totalDebito,
                        observacao: 'Calculado a partir dos lançamentos'
                    };
                    
                    console.log(`   💡 Saldo calculado: R$ ${saldoCalculado.toFixed(2)}`);
                }
            }
            
            console.log(`✅ Saldo obtido - Saldo do dia: R$ ${saldos.saldoDoDia?.valor?.toFixed(2) || 'N/A'}\n`);
            
            return saldos;
            
        } catch (error) {
            console.error(`❌ Erro ao consultar saldo: ${error.message}\n`);
            throw error;
        }
    }
}

module.exports = new BancoService();