/**
 * Serviço de autenticação OAuth 2.0 com Banco do Brasil
 * Gerencia obtenção e cache de tokens
 */
const axios = require('axios');
const config = require('../config');
const certificateLoader = require('../utils/certificateLoader');

class AuthService {
    constructor() {
        // Cache de token
        this.tokenCache = {
            token: null,
            expiresAt: null
        };
    }

    /**
     * Verifica se o token atual é válido
     * @returns {boolean}
     */
    isTokenValid() {
        if (!this.tokenCache.token || !this.tokenCache.expiresAt) {
            return false;
        }
        
        const now = Date.now();
        const bufferTime = config.token.renewBeforeExpiry;
        
        return this.tokenCache.expiresAt - now > bufferTime;
    }

    /**
     * Obtém novo token OAuth 2.0 do BB
     * @returns {Promise<string>} Token de acesso
     */
    async getNewToken() {
        console.log('\n' + '='.repeat(60));
        console.log('🔐 Obtendo novo token OAuth...');
        console.log('='.repeat(60));
        console.log('📋 Configuração:');
        console.log(`   OAuth URL: ${config.bb.oauthUrl}/oauth/token`);
        console.log(`   Client ID: ${config.bb.clientId.substring(0, 20)}...`);
        console.log(`   Client Secret: ***configurado***`);
        console.log(`   Scope: extrato-info`);
        console.log(`   mTLS: ${config.mtls.enabled ? 'ATIVADO ✅' : 'DESATIVADO'}`);
        
        try {
            const credentials = Buffer.from(
                `${config.bb.clientId}:${config.bb.clientSecret}`
            ).toString('base64');
            
            console.log('📤 Enviando requisição...');
            
            const response = await axios({
                method: 'POST',
                url: `${config.bb.oauthUrl}/oauth/token`,
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: 'grant_type=client_credentials&scope=extrato-info',
                httpsAgent: certificateLoader.getAgent(),
                timeout: config.bb.timeout
            });
            
            const { access_token, expires_in } = response.data;
            
            // Salvar no cache
            this.tokenCache.token = access_token;
            this.tokenCache.expiresAt = Date.now() + (expires_in * 1000);
            
            console.log(`✅ Token obtido com sucesso!`);
            console.log(`⏰ Expira em: ${expires_in} segundos (${Math.floor(expires_in / 60)} minutos)`);
            console.log(`🔑 Token (preview): ${access_token.substring(0, 50)}...`);
            console.log('='.repeat(60) + '\n');
            
            return access_token;
            
        } catch (error) {
            console.log('❌'.repeat(30));
            console.log('ERRO AO OBTER TOKEN');
            console.log('❌'.repeat(30));
            
            if (error.response) {
                console.log('❌ Resposta de erro do servidor:');
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Dados:`, error.response.data);
            } else if (error.request) {
                console.log('❌ Nenhuma resposta recebida do servidor');
                console.log(`Erro: ${error.message}`);
                console.log('💡 DICAS:');
                console.log('   1. Verifique sua conexão com a internet');
                console.log('   2. Verifique se a URL está correta:', config.bb.oauthUrl);
                console.log('   3. Pode haver um firewall bloqueando');
                console.log('   4. Tente testar no Postman primeiro');
                
                if (error.message.includes('certificate')) {
                    console.log('   5. PROBLEMA DE CERTIFICADO:');
                    console.log('      - Verifique se o arquivo .p12 está correto');
                    console.log('      - Verifique se a senha está correta');
                    console.log('      - Tente com USE_MTLS=false para testar sem certificado');
                }
            } else {
                console.log('❌ Erro ao configurar requisição:', error.message);
            }
            
            console.log('❌'.repeat(30));
            
            throw new Error('Falha ao obter token de autenticação');
        }
    }

    /**
     * Obtém token válido (usa cache ou renova)
     * @returns {Promise<string>} Token de acesso válido
     */
    async getToken() {
        if (this.isTokenValid()) {
            console.log('✅ Usando token do cache (ainda válido)');
            return this.tokenCache.token;
        }
        
        return await this.getNewToken();
    }

    /**
     * Obtém informações sobre o token atual
     * @returns {Object} Informações do token
     */
    getTokenInfo() {
        return {
            cached: this.isTokenValid(),
            expiresAt: this.tokenCache.expiresAt 
                ? new Date(this.tokenCache.expiresAt).toISOString() 
                : null,
            expiresIn: this.tokenCache.expiresAt 
                ? Math.floor((this.tokenCache.expiresAt - Date.now()) / 1000) 
                : 0
        };
    }

    /**
     * Limpa o cache de token
     */
    clearCache() {
        this.tokenCache = {
            token: null,
            expiresAt: null
        };
        console.log('🗑️  Cache de token limpo');
    }
}

module.exports = new AuthService();
