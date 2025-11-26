/**
 * Rotas de health check e informações do sistema
 */
const express = require('express');
const router = express.Router();
const config = require('../config');
const authService = require('../services/authService');
const certificateLoader = require('../utils/certificateLoader');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /health
 * Health check do servidor
 */
router.get('/health', (req, res) => {
    const tokenInfo = authService.getTokenInfo();
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.server.environment,
        mTLS: config.mtls.enabled,
        tokenCached: tokenInfo.cached,
        config: {
            oauthUrl: config.bb.oauthUrl,
            apiUrl: config.bb.apiUrl,
            certPath: config.mtls.certPath,
            certLoaded: certificateLoader.getAgent() !== null
        }
    });
});

/**
 * GET /info
 * Informações detalhadas do sistema
 */
router.get('/info', (req, res) => {
    const tokenInfo = authService.getTokenInfo();
    
    res.json({
        server: {
            name: 'Servidor Proxy API Banco do Brasil',
            version: '2.0.0',
            environment: config.server.environment,
            port: config.server.port
        },
        authentication: {
            tokenCached: tokenInfo.cached,
            expiresAt: tokenInfo.expiresAt,
            expiresIn: tokenInfo.expiresIn > 0 
                ? `${tokenInfo.expiresIn} segundos` 
                : 'Expirado'
        },
        mtls: {
            enabled: config.mtls.enabled,
            certPath: config.mtls.certPath,
            certLoaded: certificateLoader.getAgent() !== null
        },
        endpoints: {
            health: '/health',
            info: '/info',
            token: '/api/token',
            extrato: '/api/extrato/:agencia/:conta',
            saldo: '/api/saldo/:agencia/:conta'
        }
    });
});

module.exports = router;
