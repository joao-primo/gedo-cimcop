"""
Serviço de Criptografia para Dados Sensíveis - Sistema GEDO CIMCOP
Implementação segura usando Fernet (AES 128) para criptografia simétrica
"""
import os
import base64
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


class EncryptionService:
    """Serviço de criptografia para dados sensíveis"""

    def __init__(self):
        self._fernet = None
        self._initialize_encryption()

    def _initialize_encryption(self):
        """Inicializa o sistema de criptografia"""
        try:
            # Obter chave mestra do Render Secrets
            master_key = os.getenv('ENCRYPTION_MASTER_KEY')
            if not master_key:
                logger.warning(
                    "⚠️ ENCRYPTION_MASTER_KEY não encontrada - criptografia desabilitada")
                return

            # Derivar chave de criptografia usando PBKDF2
            salt = os.getenv('ENCRYPTION_SALT',
                             'gedo-cimcop-salt-2024').encode()
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(master_key.encode()))
            self._fernet = Fernet(key)

            logger.info("🔐 Serviço de criptografia inicializado com sucesso")

        except Exception as e:
            logger.error(f"❌ Erro ao inicializar criptografia: {e}")
            self._fernet = None

    def is_enabled(self):
        """Verifica se a criptografia está habilitada"""
        return self._fernet is not None

    def encrypt(self, data):
        """
        Criptografa dados sensíveis

        Args:
            data (str): Dados a serem criptografados

        Returns:
            str: Dados criptografados em base64 ou dados originais se criptografia desabilitada
        """
        if not data:
            return data

        if not self.is_enabled():
            logger.warning(
                "⚠️ Criptografia desabilitada - retornando dados sem criptografia")
            return data

        try:
            # Converter para bytes se necessário
            if isinstance(data, str):
                data_bytes = data.encode('utf-8')
            else:
                data_bytes = data

            # Criptografar
            encrypted_data = self._fernet.encrypt(data_bytes)

            # Retornar como string base64 com prefixo identificador
            return f"ENC:{base64.urlsafe_b64encode(encrypted_data).decode('utf-8')}"

        except Exception as e:
            logger.error(f"❌ Erro ao criptografar dados: {e}")
            # Em caso de erro, retornar dados originais para não quebrar o sistema
            return data

    def decrypt(self, encrypted_data):
        """
        Descriptografa dados sensíveis

        Args:
            encrypted_data (str): Dados criptografados em base64

        Returns:
            str: Dados descriptografados ou dados originais se não criptografados
        """
        if not encrypted_data:
            return encrypted_data

        # Verificar se os dados estão criptografados (têm prefixo ENC:)
        if not encrypted_data.startswith('ENC:'):
            # Dados não criptografados, retornar como estão
            return encrypted_data

        if not self.is_enabled():
            logger.warning(
                "⚠️ Criptografia desabilitada - não é possível descriptografar")
            return encrypted_data

        try:
            # Remover prefixo e decodificar base64
            encrypted_data_clean = encrypted_data[4:]  # Remove 'ENC:'
            encrypted_bytes = base64.urlsafe_b64decode(
                encrypted_data_clean.encode('utf-8'))

            # Descriptografar
            decrypted_data = self._fernet.decrypt(encrypted_bytes)

            # Retornar como string
            return decrypted_data.decode('utf-8')

        except Exception as e:
            logger.error(f"❌ Erro ao descriptografar dados: {e}")
            # Em caso de erro, retornar dados originais para não quebrar o sistema
            return encrypted_data

    def is_encrypted(self, data):
        """
        Verifica se os dados estão criptografados

        Args:
            data (str): Dados a verificar

        Returns:
            bool: True se estiver criptografado
        """
        if not data:
            return False

        return data.startswith('ENC:')


# Instância global
encryption_service = EncryptionService()


def generate_master_key():
    """
    Gera uma nova chave mestra para uso inicial
    ATENÇÃO: Execute apenas uma vez e armazene com segurança no Render Secrets
    """
    import secrets
    # Gerar chave de 256 bits (32 bytes)
    key = secrets.token_urlsafe(32)
    return key
