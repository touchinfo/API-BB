/**
 * Rotas de autenticação e gerenciamento de token
 */
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/token
 * Obtém informações sobre o token atual
 */
router.get('/token', asyncHandler(async (req, res) => {
    const token = await authService.getToken();
    const tokenInfo = authService.getTokenInfo();
    
    res.json({
        success: true,
        token: token.substring(0, 100) + '...',
        expiresAt: tokenInfo.expiresAt,
        expiresIn: `${tokenInfo.expiresIn} segundos`
    });
}));

/**
 * POST /api/token/refresh
 * Força renovação do token
 */
router.post('/token/refresh', asyncHandler(async (req, res) => {
    console.log('🔄 Forçando renovação do token...');
    authService.clearCache();
    
    const token = await authService.getNewToken();
    const tokenInfo = authService.getTokenInfo();
    
    res.json({
        success: true,
        message: 'Token renovado com sucesso',
        token: token.substring(0, 100) + '...',
        expiresAt: tokenInfo.expiresAt,
        expiresIn: `${tokenInfo.expiresIn} segundos`
    });
}));

/**
 * DELETE /api/token
 * Limpa o cache de token
 */
router.delete('/token', (req, res) => {
    authService.clearCache();
    
    res.json({
        success: true,
        message: 'Cache de token limpo com sucesso'
    });
});

module.exports = router;
