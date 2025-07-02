from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
import os
import logging
from config import config

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def ensure_database_directory():
    """Garantir que o diretório do banco existe (apenas para SQLite)"""
    config_name = os.getenv('FLASK_ENV', 'development')
    if config_name != 'production':  # Só criar diretório se não for produção
        db_dir = os.path.join(os.path.dirname(__file__), 'database')
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)
            logger.info(f"📁 Diretório do banco criado: {db_dir}")


# Inicializar extensões
db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    # Configuração baseada no ambiente
    env = os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config.get(env, config['default']))

    # Inicializar extensões
    db.init_app(app)
    jwt.init_app(app)

    # Configurar CORS
    CORS(app, origins=[app.config['FRONTEND_URL']])

    # Registrar blueprints/rotas
    register_routes(app)

    # Criar tabelas
    with app.app_context():
        ensure_database_directory()  # Mudança aqui
        try:
            db.create_all()
            logger.info("✅ Tabelas do banco de dados criadas com sucesso!")
        except Exception as e:
            logger.error(f"❌ Erro ao criar tabelas: {str(e)}")
            raise

    return app


def register_routes(app):
    @app.route('/')
    def home():
        return jsonify({
            'message': 'GEDO CIMCOP API está funcionando!',
            'status': 'success',
            'environment': os.environ.get('FLASK_ENV', 'development'),
            'database': 'PostgreSQL' if os.environ.get('DATABASE_URL') else 'SQLite'
        })

    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Verificação de saúde da API"""
        # Detectar tipo de banco
        database_url = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        if database_url.startswith('postgresql://'):
            db_type = 'PostgreSQL'
        elif database_url.startswith('sqlite://'):
            db_type = 'SQLite'
        else:
            db_type = 'Unknown'

        # Testar conexão com banco
        try:
            db.session.execute('SELECT 1')
            db_status = 'connected'
        except Exception as e:
            db_status = f'error: {str(e)}'

        return {
            'status': 'ok',
            'message': 'GEDO CIMCOP API está funcionando',
            'version': '1.0.0',
            'environment': os.getenv('FLASK_ENV', 'development'),
            'database': {
                'type': db_type,
                'status': db_status
            },
            'features': [
                'Autenticação',
                'Gestão de Obras',
                'Registros de Documentos',
                'Pesquisa Avançada',
                'Dashboard',
                'Configurações',
                'Importação em Lote',
                'Reset de Senha'
            ]
        }, 200

    @app.route('/api/test')
    def test_api():
        return jsonify({
            'message': 'API funcionando corretamente!',
            'timestamp': str(db.func.now())
        })

# Modelos de exemplo (você pode expandir conforme necessário)


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    user = db.relationship('User', backref=db.backref('documents', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


def check_database_integrity():
    """Verificar integridade do banco de dados"""
    try:
        # Testar conexão básica primeiro
        db.session.execute('SELECT 1')
        logger.info("✅ Conexão com banco de dados: OK")

        # Assuming ConfiguracaoWorkflow and PasswordResetToken are defined elsewhere
        # For demonstration purposes, I'm commenting out these lines.
        # ConfiguracaoWorkflow.query.first()
        # logger.info("✅ Tabela configuracoes_workflow: OK")

        # PasswordResetToken.query.first()
        # logger.info("✅ Tabela password_reset_tokens: OK")
        return True
    except Exception as e:
        logger.error(f"❌ Problema nas tabelas: {e}")
        return False


if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))

    logger.info(f"🚀 Iniciando servidor na porta {port}")
    logger.info(f"🌍 Ambiente: {os.environ.get('FLASK_ENV', 'development')}")
    logger.info(
        f"🗄️ Banco: {'PostgreSQL' if os.environ.get('DATABASE_URL') else 'SQLite'}")

    app.run(host='0.0.0.0', port=port, debug=False)
