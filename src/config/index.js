/**
 * Configuração centralizada do servidor
 * Carrega todas as variáveis de ambiente e exporta configurações
 */
require('dotenv').config();

module.exports = {
    // Configurações do servidor
    server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development'
    },

    // Credenciais OAuth do Banco do Brasil
    bb: {
        clientId: process.env.BB_CLIENT_ID,
        clientSecret: process.env.BB_CLIENT_SECRET,
        devAppKey: process.env.BB_DEV_APP_KEY,
        
        // URLs da API
        oauthUrl: process.env.BB_OAUTH_URL || 'https://oauth.bb.com.br',
        apiUrl: process.env.BB_API_URL || 'https://api-extratos.bb.com.br',
        
        // Configuração de timeout
        timeout: 30000 // 30 segundos
    },

    // Configuração mTLS
    mtls: {
        enabled: process.env.USE_MTLS === 'true',
        certPath: process.env.BB_CERT_PATH || './certificados/TOUCH.p12',
        certPassword: process.env.BB_CERT_PASSWORD || ''
    },

    // Configuração de cache de token
    token: {
        // Renova token X minutos antes de expirar
        renewBeforeExpiry: 5 * 60 * 1000 // 5 minutos
    }
};
