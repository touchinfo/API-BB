/**
 * Serviço para interagir com a API do Banco do Brasil
 * Fornece métodos para consultar extratos, saldo, etc.
 */
const axios = require('axios');
const config = require('../config');
const authService = require('./authService');
const certificateLoader = require('../utils/certificateLoader');

class BancoService {
    /**
     * Converte data do formato YYYY-MM-DD para DD.MM.YYYY
     * A API do BB pode exigir o formato DD.MM.YYYY
     * @param {string} date Data no formato YYYY-MM-DD
     * @returns {string} Data no formato DD.MM.YYYY
     */
    convertDateFormat(date) {
        if (!date) return null;
        
        // Se já estiver no formato DD.MM.YYYY, retorna como está
        if (date.includes('.')) return date;
        
        // Converte YYYY-MM-DD para DD.MM.YYYY
        const [year, month, day] = date.split('-');
        return `${day}.${month}.${year}`;
    }

    /**
     * Monta a URL base com dev-app-key
     * @param {string} path Caminho da API
     * @returns {string} URL completa
     */
    buildUrl(path) {
        return `${config.bb.apiUrl}${path}?gw-dev-app-key=${config.bb.devAppKey}`;
    }

    /**
     * Adiciona parâmetros de query à URL
     * @param {string} url URL base
     * @param {Object} params Parâmetros
     * @returns {string} URL com parâmetros
     */
    addQueryParams(url, params) {
        const validParams = Object.entries(params)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        
        return validParams ? `${url}&${validParams}` : url;
    }

    /**
     * Faz requisição autenticada à API do BB
     * @param {Object} options Opções da requisição
     * @returns {Promise<Object>} Resposta da API
     */
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
     * @param {string} agencia Número da agência
     * @param {string} conta Número da conta
     * @param {Object} options Opções adicionais
     * @param {string} options.dataInicio Data início (YYYY-MM-DD)
     * @param {string} options.dataFim Data fim (YYYY-MM-DD)
     * @returns {Promise<Object>} Dados do extrato
     */
    async getExtrato(agencia, conta, options = {}) {
        console.log('\n' + '='.repeat(60));
        console.log(`📊 Consultando extrato`);
        console.log('='.repeat(60));
        console.log(`   Agência: ${agencia}`);
        console.log(`   Conta: ${conta}`);
        if (options.dataInicio) console.log(`   Data Início (original): ${options.dataInicio}`);
        if (options.dataFim) console.log(`   Data Fim (original): ${options.dataFim}`);
        
        try {
            const path = `/extratos/v1/conta-corrente/agencia/${agencia}/conta/${conta}`;
            let url = this.buildUrl(path);
            
            // Converter datas para formato DD.MM.YYYY se necessário
            const dataInicioFormatted = this.convertDateFormat(options.dataInicio);
            const dataFimFormatted = this.convertDateFormat(options.dataFim);
            
            if (dataInicioFormatted) console.log(`   Data Início (convertida): ${dataInicioFormatted}`);
            if (dataFimFormatted) console.log(`   Data Fim (convertida): ${dataFimFormatted}`);
            
            url = this.addQueryParams(url, {
                dataInicio: dataInicioFormatted,
                dataFim: dataFimFormatted
            });
            
            console.log(`📡 URL: ${url}`);
            console.log('📤 Enviando requisição...');
            
            const data = await this.makeRequest({
                method: 'GET',
                url: url
            });
            
            console.log('✅ Extrato obtido com sucesso!');
            console.log(`📦 Dados recebidos: ${JSON.stringify(data).length} bytes`);
            console.log('='.repeat(60) + '\n');
            
            return data;
            
        } catch (error) {
            console.log('❌ Erro ao consultar extrato');
            
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Erro:`, error.response.data);
            } else {
                console.log(`   Erro: ${error.message}`);
            }
            
            console.log('='.repeat(60) + '\n');
            
            throw error;
        }
    }

    /**
     * Consulta saldo de conta corrente
     * @param {string} agencia Número da agência
     * @param {string} conta Número da conta
     * @returns {Promise<Object>} Dados do saldo
     */
    async getSaldo(agencia, conta) {
        console.log('\n' + '='.repeat(60));
        console.log(`💰 Consultando saldo`);
        console.log('='.repeat(60));
        console.log(`   Agência: ${agencia}`);
        console.log(`   Conta: ${conta}`);
        
        try {
            const path = `/extratos/v1/conta-corrente/agencia/${agencia}/conta/${conta}/saldo`;
            const url = this.buildUrl(path);
            
            console.log(`📡 URL: ${url}`);
            console.log('📤 Enviando requisição...');
            
            const data = await this.makeRequest({
                method: 'GET',
                url: url
            });
            
            console.log('✅ Saldo obtido com sucesso!');
            console.log('='.repeat(60) + '\n');
            
            return data;
            
        } catch (error) {
            console.log('❌ Erro ao consultar saldo');
            
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Erro:`, error.response.data);
            } else {
                console.log(`   Erro: ${error.message}`);
            }
            
            console.log('='.repeat(60) + '\n');
            
            throw error;
        }
    }
}

module.exports = new BancoService();