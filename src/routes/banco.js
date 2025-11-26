/**
 * Rotas para consultas bancárias (extrato, saldo, etc.)
 */
const express = require('express');
const router = express.Router();
const bancoService = require('../services/bancoService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/extrato/:agencia/:conta
 * Consulta extrato bancário
 * 
 * @param {string} agencia - Número da agência
 * @param {string} conta - Número da conta
 * @query {string} dataInicio - Data de início (YYYY-MM-DD) - opcional
 * @query {string} dataFim - Data de fim (YYYY-MM-DD) - opcional
 */
router.get('/extrato/:agencia/:conta', asyncHandler(async (req, res) => {
    const { agencia, conta } = req.params;
    const { dataInicio, dataFim } = req.query;
    
    // Validações básicas
    if (!agencia || !conta) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Agência e conta são obrigatórios'
            }
        });
    }
    
    // Consultar extrato
    const data = await bancoService.getExtrato(agencia, conta, {
        dataInicio,
        dataFim
    });
    
    res.json({
        success: true,
        data: data
    });
}));

/**
 * GET /api/saldo/:agencia/:conta
 * Consulta saldo bancário
 * 
 * @param {string} agencia - Número da agência
 * @param {string} conta - Número da conta
 */
router.get('/saldo/:agencia/:conta', asyncHandler(async (req, res) => {
    const { agencia, conta } = req.params;
    
    // Validações básicas
    if (!agencia || !conta) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Agência e conta são obrigatórios'
            }
        });
    }
    
    // Consultar saldo
    const data = await bancoService.getSaldo(agencia, conta);
    
    res.json({
        success: true,
        data: data
    });
}));

module.exports = router;
