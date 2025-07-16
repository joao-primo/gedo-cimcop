"""
Script para Gerar Chave Mestra de Criptografia
Execute apenas uma vez e armazene a chave com segurança no Render Secrets
"""

import sys
import os
import logging

# ✅ Primeiro ajuste o sys.path ANTES de importar qualquer módulo
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ✅ Agora os imports funcionarão
from services.encryption_service import generate_master_key

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    """Gera nova chave mestra para criptografia"""
    logger.info("🔑 Gerando nova chave mestra de criptografia...")

    try:
        # Gerar chave mestra
        master_key = generate_master_key()

        logger.info("✅ Chave mestra gerada com sucesso!")
        logger.info("")
        logger.info("🔐 CHAVE MESTRA DE CRIPTOGRAFIA:")
        logger.info("=" * 60)
        print(master_key)
        logger.info("=" * 60)
        logger.info("")
        logger.info("⚠️  INSTRUÇÕES IMPORTANTES:")
        logger.info("1. COPIE esta chave e armazene com segurança")
        logger.info("2. Adicione no Render Secrets como ENCRYPTION_MASTER_KEY")
        logger.info("3. NUNCA compartilhe esta chave")
        logger.info("4. NUNCA commite esta chave no código")
        logger.info("5. Faça backup seguro desta chave")
        logger.info("")
        logger.info("📋 Passos no Render:")
        logger.info("1. Acesse dashboard.render.com")
        logger.info("2. Vá para seu serviço backend")
        logger.info("3. Environment → Add Environment Variable")
        logger.info("4. Key: ENCRYPTION_MASTER_KEY")
        logger.info("5. Value: [cole a chave acima]")
        logger.info("6. Clique em Save Changes")

    except Exception as e:
        logger.error(f"❌ Erro ao gerar chave: {e}")
        raise


if __name__ == '__main__':
    main()
