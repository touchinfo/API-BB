/**
 * Middleware de logging de requisições
 */

/**
 * Middleware para logar todas as requisições HTTP
 */
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    
    console.log(`\n[${timestamp}] ${method} ${url}`);
    
    // Logar query parameters se existirem
    if (Object.keys(req.query).length > 0) {
        console.log('Query Params:', req.query);
    }
    
    // Logar body se existir (exceto senhas)
    if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) sanitizedBody.password = '***';
        if (sanitizedBody.senha) sanitizedBody.senha = '***';
        console.log('Body:', sanitizedBody);
    }
    
    next();
};

/**
 * Middleware para logar tempo de resposta
 */
const responseLogger = (req, res, next) => {
    const start = Date.now();
    
    // Interceptar o método end para logar quando a resposta terminar
    const originalEnd = res.end;
    res.end = function(...args) {
        const duration = Date.now() - start;
        console.log(`✓ Response: ${res.statusCode} - ${duration}ms\n`);
        originalEnd.apply(res, args);
    };
    
    next();
};

module.exports = {
    requestLogger,
    responseLogger
};
