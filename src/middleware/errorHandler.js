/**
 * Middleware para tratamento centralizado de erros
 */

/**
 * Middleware de tratamento de erros HTTP
 * @param {Error} err Erro capturado
 * @param {Request} req Requisição Express
 * @param {Response} res Resposta Express
 * @param {Function} next Próximo middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Erro capturado pelo middleware:', err.message);
    
    // Erro de resposta do Axios
    if (err.response) {
        return res.status(err.response.status).json({
            success: false,
            error: {
                message: 'Erro na comunicação com o Banco do Brasil',
                status: err.response.status,
                details: err.response.data
            }
        });
    }
    
    // Erro de requisição (sem resposta)
    if (err.request) {
        return res.status(503).json({
            success: false,
            error: {
                message: 'Serviço indisponível',
                details: 'Não foi possível conectar ao Banco do Brasil'
            }
        });
    }
    
    // Erro genérico
    return res.status(500).json({
        success: false,
        error: {
            message: err.message || 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
};

/**
 * Middleware para capturar erros assíncronos
 * Envolve funções async/await para capturar erros
 * @param {Function} fn Função assíncrona
 * @returns {Function} Função com tratamento de erro
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Middleware para tratar rotas não encontradas
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: 'Rota não encontrada',
            path: req.originalUrl
        }
    });
};

module.exports = {
    errorHandler,
    asyncHandler,
    notFoundHandler
};
