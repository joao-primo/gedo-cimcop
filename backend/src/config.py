import os
from datetime import timedelta


class Config:
    """Configuração base"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'gedo-cimcop-secret-key-2024'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True

    # Upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or 'uploads'

    # Session settings
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = os.environ.get('SESSION_COOKIE_HTTPONLY', 'True').lower() == 'true'
    SESSION_COOKIE_SAMESITE = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')

    # Email settings
    EMAIL_SERVIDOR = os.environ.get('EMAIL_SERVIDOR', 'smtp.gmail.com')
    EMAIL_PORTA = int(os.environ.get('EMAIL_PORTA', 587))
    EMAIL_USUARIO = os.environ.get('EMAIL_USUARIO', '')
    EMAIL_SENHA = os.environ.get('EMAIL_SENHA', '')
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
    EMAIL_FROM = os.environ.get('EMAIL_FROM', 'noreply@gedo.com')

    # Frontend URL
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

    # CORREÇÃO: Headers de segurança balanceados
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
    }

    @staticmethod
    def init_app(app):
        pass


class DevelopmentConfig(Config):
    """Configuração de desenvolvimento"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'sqlite:///' + \
        os.path.join(os.path.dirname(__file__), 'database', 'app.db')

    # CORS mais permissivo para desenvolvimento
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]


class TestingConfig(Config):
    """Configuração de testes"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'TEST_DATABASE_URL') or 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    """Configuração de produção"""
    DEBUG = False
    
    # Configuração inteligente do banco de dados
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        # PostgreSQL - corrigir URL se necessário
        if DATABASE_URL.startswith('postgres://'):
            DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
        
        # Configurações específicas para PostgreSQL
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_pre_ping': True,
            'pool_recycle': 300,
            'pool_timeout': 20,
            'max_overflow': 0
        }
    else:
        # Fallback para SQLite se DATABASE_URL não estiver definida
        SQLALCHEMY_DATABASE_URI = 'sqlite:///' + \
            os.path.join(os.path.dirname(__file__), 'database', 'app.db')

    # CORREÇÃO: Configurações de cookies seguras mas funcionais
    SESSION_COOKIE_SECURE = True  # HTTPS obrigatório em produção
    SESSION_COOKIE_HTTPONLY = True  # MANTIDO: Segurança contra XSS
    SESSION_COOKIE_SAMESITE = 'None'  # NECESSÁRIO: Para cross-origin
    
    # CORREÇÃO: Headers de segurança balanceados
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',  # Menos restritivo que DENY
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        # CSP removido para evitar bloqueios
    }

    # CORREÇÃO: CORS configurado corretamente
    @property
    def CORS_ORIGINS(self):
        origins = [
            'https://gedo-cimcop.vercel.app',
            'https://gedo-cimcop-frontend.vercel.app'
        ]
        
        # Adicionar FRONTEND_URL se definida
        frontend_url = os.environ.get('FRONTEND_URL')
        if frontend_url and frontend_url not in origins:
            origins.append(frontend_url)
        
        # Adicionar origens do ambiente
        env_origins = os.environ.get('CORS_ORIGINS', '')
        if env_origins:
            origins.extend([origin.strip() for origin in env_origins.split(',') if origin.strip()])
        
        return list(set(origins))  # Remover duplicatas

    @classmethod
    def init_app(cls, app):
        Config.init_app(app)

        # Log para syslog em produção
        import logging
        from logging.handlers import SysLogHandler
        syslog_handler = SysLogHandler()
        syslog_handler.setLevel(logging.WARNING)
        app.logger.addHandler(syslog_handler)


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config():
    """Retorna a configuração baseada na variável de ambiente"""
    return config[os.getenv('FLASK_ENV', 'development')]
