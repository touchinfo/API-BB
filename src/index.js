const express = require('express');
const cors = require('cors');
const config = require('./config');
const certificateLoader = require('./utils/certificateLoader');

// Middlewares
const { requestLogger, responseLogger } = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Rotas
const systemRoutes = require('./routes/system');
const authRoutes = require('./routes/auth');
const bancoRoutes = require('./routes/banco');

// Inicializar Express
const app = express();

// ========================================
// MIDDLEWARES GLOBAIS
// ========================================

// CORS
app.use(cors());

// Parse JSON
app.use(express.json());

// Logger de requisições
app.use(requestLogger);
app.use(responseLogger);

// ========================================
// ROTAS
// ========================================

// Rotas de sistema (health check, info)
app.use('/', systemRoutes);

// Rotas de autenticação
app.use('/api', authRoutes);

// Rotas de banco
app.use('/api', bancoRoutes);

// ========================================
// TRATAMENTO DE ERROS
// ========================================

// 404 - Rota não encontrada
app.use(notFoundHandler);

// Middleware de erro (deve ser o último)
app.use(errorHandler);

// ========================================
// INICIALIZAÇÃO
// ========================================

/**
 * Inicializa o servidor
 */
function startServer() {
    console.log('\n' + '='.repeat(60));
    console.log('🏦 Servidor Proxy API Banco do Brasil v2.0.0');
    console.log('='.repeat(60));
    
    // Carregar certificado se mTLS estiver habilitado
    if (config.mtls.enabled) {
        certificateLoader.load();
    }
    
    // Iniciar servidor HTTP
    app.listen(config.server.port, () => {
        console.log(`\n🚀 Servidor rodando em: http://localhost:${config.server.port}`);
        console.log(`🌍 Ambiente: ${config.server.environment}`);
        console.log(`🔒 mTLS: ${config.mtls.enabled ? 'ATIVADO ✅' : 'DESATIVADO ⚠️'}`);
        
        if (config.mtls.enabled) {
            console.log(`📜 Certificado: ${config.mtls.certPath}`);
            console.log(`🔐 Validação SSL: ${certificateLoader.getAgent() ? 'ATIVADA ✅' : 'DESATIVADA ⚠️'}`);
        }
        
        console.log(`\n🌐 OAuth URL: ${config.bb.oauthUrl}`);
        console.log(`📡 API URL: ${config.bb.apiUrl}`);
        
        console.log('\n📚 Endpoints disponíveis:');
        console.log('   Sistema:');
        console.log('   GET  /health          - Health check');
        console.log('   GET  /info            - Informações do sistema');
        console.log('\n   Autenticação:');
        console.log('   GET  /api/token       - Obter token atual');
        console.log('   POST /api/token/refresh - Renovar token');
        console.log('   DELETE /api/token     - Limpar cache de token');
        console.log('\n   Banco:');
        console.log('   GET  /api/extrato/:agencia/:conta  - Consultar extrato');
        console.log('   GET  /api/saldo/:agencia/:conta    - Consultar saldo');
        
        console.log('\n💡 Exemplos de uso:');
        console.log(`   curl http://localhost:${config.server.port}/health`);
        console.log(`   curl http://localhost:${config.server.port}/api/extrato/3418/1925`);
        console.log(`   curl "http://localhost:${config.server.port}/api/extrato/3418/1925?dataInicio=2025-01-01&dataFim=2025-10-22"`);
        console.log('='.repeat(60) + '\n');
    });
}

// ========================================
// TRATAMENTO DE ERROS GLOBAIS
// ========================================

process.on('unhandledRejection', (error) => {
    console.error('❌ Erro não tratado (Promise):', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Exceção não capturada:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 Recebido SIGTERM. Encerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 Recebido SIGINT. Encerrando servidor...');
    process.exit(0);
});

// ========================================
// INICIAR SERVIDOR
// ========================================

startServer();

module.exports = app;
