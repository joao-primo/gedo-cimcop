import os
from datetime import timedelta


class Config:
    """Configuração base"""
    SECRET_KEY = os.environ.get(
        'SECRET_KEY') or 'gedo-cimcop-super-secret-key-2024'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get(
        'JWT_SECRET_KEY') or 'gedo-cimcop-jwt-secret-2024'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # Upload Configuration
    MAX_CONTENT_LENGTH = int(os.environ.get(
        'MAX_CONTENT_LENGTH', 16777216))  # 16MB default
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')

    # Session Configuration
    SESSION_COOKIE_SECURE = os.environ.get(
        'SESSION_COOKIE_SECURE', 'false').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = os.environ.get(
        'SESSION_COOKIE_HTTPONLY', 'true').lower() == 'true'
    SESSION_COOKIE_SAMESITE = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')

    # Encryption Configuration
    ENCRYPTION_MASTER_KEY = os.environ.get('ENCRYPTION_MASTER_KEY')
    ENCRYPTION_SALT = os.environ.get(
        'ENCRYPTION_SALT', 'gedo-cimcop-salt-2024')

    # CORS Configuration
    CORS_ORIGINS = []

    # Security Headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block'
    }

    @staticmethod
    def init_app(app):
        pass


class DevelopmentConfig(Config):
    """Configuração de desenvolvimento"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + \
        os.path.join(os.path.dirname(__file__), 'database', 'app.db')

    # CORS mais permissivo para desenvolvimento
    CORS_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000'
    ]

    # Headers menos restritivos para desenvolvimento
    SECURITY_HEADERS = {}


class TestingConfig(Config):
    """Configuração de testes"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    """Configuração de produção"""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

    # CORREÇÃO CRÍTICA: CORS específico para produção
    def __init__(self):
        super().__init__()
        cors_origins_env = os.environ.get('CORS_ORIGINS', '')
        if cors_origins_env:
            self.CORS_ORIGINS = [
                origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]
        else:
            # Fallback para URLs conhecidas
            self.CORS_ORIGINS = [
                'https://gedo-cimcop.vercel.app',
                'https://gedo-cimcop-frontend.vercel.app'
            ]

        # Adicionar FRONTEND_URL se existir
        frontend_url = os.environ.get('FRONTEND_URL')
        if frontend_url and frontend_url not in self.CORS_ORIGINS:
            self.CORS_ORIGINS.append(frontend_url)

    # Session mais segura para produção
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = os.environ.get(
        'SESSION_COOKIE_HTTPONLY', 'false').lower() == 'true'
    SESSION_COOKIE_SAMESITE = os.environ.get('SESSION_COOKIE_SAMESITE', 'None')

    @staticmethod
    def init_app(app):
        Config.init_app(app)

        # Log para verificar configuração
        import logging
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)
        logger.info(
            f"🔧 CORS Origins configurados: {app.config.get('CORS_ORIGINS', [])}")


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
