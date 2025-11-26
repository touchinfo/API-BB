const https = require('https');
const fs = require('fs');
const forge = require('node-forge');
const config = require('../config');

class CertificateLoader {
    constructor() {
        this.httpsAgent = null;
    }

    /**
     * Carrega certificado .p12 e retorna HTTPS Agent configurado
     * @returns {https.Agent|null} Agent configurado ou null se falhar
     */
    load() {
        if (!config.mtls.enabled) {
            console.log('ℹ️  mTLS desabilitado na configuração');
            return null;
        }

        try {
            console.log('📂 Carregando certificado .p12...');
            console.log(`   Arquivo: ${config.mtls.certPath}`);
            
            // Verificar se arquivo existe
            if (!fs.existsSync(config.mtls.certPath)) {
                throw new Error(`Arquivo de certificado não encontrado: ${config.mtls.certPath}`);
            }

            // Ler arquivo .p12/.pfx
            const p12Data = fs.readFileSync(config.mtls.certPath, 'binary');
            
            console.log(`   Tamanho: ${p12Data.length} bytes`);
            console.log(`   Senha: ${config.mtls.certPassword ? '***configurada***' : '(vazia)'}`);
            
            // Usar node-forge para ler .p12 com algoritmos antigos
            console.log('🔧 Decodificando .p12 com node-forge...');
            
            const p12Asn1 = forge.asn1.fromDer(p12Data);
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, config.mtls.certPassword);
            
            // Extrair certificado e chave
            const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
            
            // Validar se encontrou certificado e chave
            if (!certBags[forge.pki.oids.certBag] || certBags[forge.pki.oids.certBag].length === 0) {
                throw new Error('Certificado não encontrado no arquivo .p12');
            }
            
            if (!keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].length === 0) {
                throw new Error('Chave privada não encontrada no arquivo .p12');
            }
            
            // Converter para PEM
            const certBag = certBags[forge.pki.oids.certBag][0];
            const cert = forge.pki.certificateToPem(certBag.cert);
            
            const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
            const key = forge.pki.privateKeyToPem(keyBag.key);
            
            console.log('✅ Certificado decodificado com sucesso!');
            console.log(`   Certificado: ${cert.length} bytes`);
            console.log(`   Chave: ${key.length} bytes`);
            
            // Criar HTTPS Agent com cert e key em PEM
            this.httpsAgent = new https.Agent({
                cert: cert,
                key: key,
                rejectUnauthorized: true // Validar certificado do servidor
            });
            
            console.log('✅ Certificado .p12 carregado com sucesso');
            console.log('🔒 Validação SSL: ATIVADA');
            
            return this.httpsAgent;
            
        } catch (error) {
            console.error('❌ Erro ao carregar certificado .p12:', error.message);
            console.log('⚠️  Continuando sem mTLS (modo desenvolvimento)');
            console.log('💡 Dicas:');
            console.log('   - Verifique se o arquivo existe:', config.mtls.certPath);
            console.log('   - Verifique se a senha está correta no .env');
            console.log('   - Erro detalhado:', error.message);
            
            return null;
        }
    }

    /**
     * Retorna o agent configurado
     * @returns {https.Agent|null}
     */
    getAgent() {
        return this.httpsAgent;
    }
}

module.exports = new CertificateLoader();
