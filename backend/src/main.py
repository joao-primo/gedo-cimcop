from routes.workflow import workflow_bp
from routes.pesquisa import pesquisa_bp
from routes.dashboard import dashboard_bp
from routes.registros import registros_bp
from routes.tipos_registro import tipos_registro_bp
from routes.obras import obras_bp
from routes.auth import auth_bp
from routes.user import user_bp
from routes.configuracoes import configuracoes_bp, init_configuracoes
from routes.importacao import importacao_bp
from routes.password_reset import password_reset_bp
from routes.classificacoes import classificacoes_bp
from models.configuracao_workflow import ConfiguracaoWorkflow
from models.configuracao import Configuracao, ConfiguracaoUsuario
from models.registro import Registro
from models.tipo_registro import TipoRegistro
from models.obra import Obra
from models.user import db, User
from models.password_reset import PasswordResetToken
from models.audit_log import AuditLog
from models.classificacao import Classificacao
from config import config
from flask_cors import CORS
from flask import Flask, send_from_directory, request
from sqlalchemy import text
import os
import sys
import logging
from flask_seasurf import SeaSurf
from extensions import limiter
from flask_limiter.util import get_remote_address

# Configurar logging estruturado
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s'
)
logger = logging.getLogger(__name__)

# Adicionar o diretório atual ao path para importar services
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def create_app(config_name=None):
    """Factory function para criar a aplicação Flask"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__, static_folder=os.path.join(
        os.path.dirname(__file__), 'static'))

    # Carregar configuração
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)

    # CORS mais permissivo
    if config_name == 'production':
        # URLs permitidas em produção
        allowed_origins = [
            'https://gedo-cimcop.vercel.app',
            'https://gedo-cimcop-frontend.vercel.app',
            'https://*.vercel.app',
        ]

        # Adicionar URL do ambiente se existir
        if app.config.get('FRONTEND_URL'):
            allowed_origins.append(app.config['FRONTEND_URL'])

        # Adicionar URLs adicionais se existirem
        if os.getenv('ADDITIONAL_ORIGINS'):
            allowed_origins.extend(os.getenv('ADDITIONAL_ORIGINS').split(','))

        logger.info(f"🌐 CORS configurado para produção: {allowed_origins}")

        CORS(app,
             origins=allowed_origins,
             supports_credentials=True,
             methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             allow_headers=["Content-Type",
                            "Authorization", "X-Requested-With"],
             expose_headers=["Content-Range", "X-Content-Range"])
    else:
        # Desenvolvimento - mais permissivo
        logger.info("🌐 CORS configurado para desenvolvimento")
        CORS(app,
             origins=["http://localhost:5173",
                      "http://127.0.0.1:5173", "http://localhost:3000"],
             supports_credentials=True,
             methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             allow_headers=["Content-Type",
                            "Authorization", "X-Requested-With"],
             expose_headers=["Content-Range", "X-Content-Range"])

    # Inicializar extensões
    db.init_app(app)

    # Registrar blueprints
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(password_reset_bp, url_prefix='/api')
    app.register_blueprint(obras_bp, url_prefix='/api/obras')
    app.register_blueprint(tipos_registro_bp, url_prefix='/api/tipos-registro')
    app.register_blueprint(registros_bp, url_prefix='/api/registros')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(pesquisa_bp, url_prefix='/api/pesquisa')
    app.register_blueprint(configuracoes_bp, url_prefix='/api/configuracoes')
    app.register_blueprint(importacao_bp, url_prefix='/api/importacao')
    app.register_blueprint(workflow_bp, url_prefix='/api/workflow')
    app.register_blueprint(classificacoes_bp, url_prefix='/api/classificacoes')

    # Middleware CORS manual para casos especiais
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            headers = response.headers

            # Headers CORS manuais
            origin = request.headers.get('Origin')
            if origin:
                if config_name == 'production':
                    allowed_origins = [
                        'https://gedo-cimcop.vercel.app',
                        'https://gedo-cimcop-frontend.vercel.app'
                    ]
                    if origin in allowed_origins or origin.endswith('.vercel.app'):
                        headers['Access-Control-Allow-Origin'] = origin
                else:
                    headers['Access-Control-Allow-Origin'] = origin

            headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
            headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
            headers['Access-Control-Allow-Credentials'] = 'true'
            headers['Access-Control-Max-Age'] = '86400'

            return response

    @app.after_request
    def security_headers(response):
        """Adiciona headers de segurança"""
        # Headers CORS adicionais apenas se necessário
        try:
            origin = request.headers.get('Origin')
            if origin and config_name == 'production':
                if origin.endswith('.vercel.app') or origin in ['https://gedo-cimcop.vercel.app']:
                    response.headers['Access-Control-Allow-Origin'] = origin
                    response.headers['Access-Control-Allow-Credentials'] = 'true'
        except Exception as e:
            # Se houver erro, apenas log e continue
            logger.debug(f"Erro ao processar headers CORS: {e}")

        # Headers de segurança apenas em produção
        if config_name == 'production':
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-XSS-Protection'] = '1; mode=block'

        return response

    # Handlers de erro
    @app.errorhandler(404)
    def not_found(error):
        return {'message': 'Recurso não encontrado'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        logger.error(f"Erro interno: {str(error)}")
        return {'message': 'Erro interno do servidor'}, 500

    @app.errorhandler(413)
    def too_large(error):
        return {'message': 'Arquivo muito grande'}, 413

    csrf = SeaSurf(app)

    limiter.init_app(app)

    return app


def migrate_blob_columns():
    """Migração automática das colunas do Vercel Blob"""
    try:
        # Verificar se as colunas já existem
        result = db.session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'registros' 
            AND column_name IN ('blob_url', 'blob_pathname')
        """))

        existing_columns = [row[0] for row in result.fetchall()]

        # Adicionar blob_url se não existir
        if 'blob_url' not in existing_columns:
            logger.info("➕ Adicionando coluna blob_url...")
            db.session.execute(text("""
                ALTER TABLE registros 
                ADD COLUMN blob_url VARCHAR(500)
            """))
            logger.info("✅ Coluna blob_url adicionada")

        # Adicionar blob_pathname se não existir
        if 'blob_pathname' not in existing_columns:
            logger.info("➕ Adicionando coluna blob_pathname...")
            db.session.execute(text("""
                ALTER TABLE registros 
                ADD COLUMN blob_pathname VARCHAR(500)
            """))
            logger.info("✅ Coluna blob_pathname adicionada")

        # Commit das alterações
        db.session.commit()
        logger.info("🎉 Migração das colunas Blob concluída!")
        return True

    except Exception as e:
        logger.error(f"❌ Erro na migração Blob: {str(e)}")
        db.session.rollback()
        return False


def migrate_classificacao_columns():
    """Migração automática das colunas de classificação"""
    try:
        # Verificar se as colunas já existem
        result = db.session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'registros' 
            AND column_name IN ('classificacao_grupo', 'classificacao_subgrupo', 'classificacao_id')
        """))

        existing_columns = [row[0] for row in result.fetchall()]

        # Adicionar classificacao_grupo se não existir
        if 'classificacao_grupo' not in existing_columns:
            logger.info("➕ Adicionando coluna classificacao_grupo...")
            db.session.execute(text("""
                ALTER TABLE registros 
                ADD COLUMN classificacao_grupo VARCHAR(100)
            """))
            logger.info("✅ Coluna classificacao_grupo adicionada")

        # Adicionar classificacao_subgrupo se não existir
        if 'classificacao_subgrupo' not in existing_columns:
            logger.info("➕ Adicionando coluna classificacao_subgrupo...")
            db.session.execute(text("""
                ALTER TABLE registros 
                ADD COLUMN classificacao_subgrupo VARCHAR(100)
            """))
            logger.info("✅ Coluna classificacao_subgrupo adicionada")

        # Adicionar classificacao_id se não existir
        if 'classificacao_id' not in existing_columns:
            logger.info("➕ Adicionando coluna classificacao_id...")
            db.session.execute(text("""
                ALTER TABLE registros 
                ADD COLUMN classificacao_id INTEGER
            """))
            logger.info("✅ Coluna classificacao_id adicionada")

        # Commit das alterações
        db.session.commit()
        logger.info("🎉 Migração das colunas de Classificação concluída!")
        return True

    except Exception as e:
        logger.error(f"❌ Erro na migração de Classificação: {str(e)}")
        db.session.rollback()
        return False


def check_database_integrity():
    """Verificar integridade do banco de dados"""
    try:
        db.session.execute(text('SELECT 1'))
        logger.info("✅ Tabela configuracoes_workflow: OK")

        PasswordResetToken.query.first()
        logger.info("✅ Tabela password_reset_tokens: OK")
        return True
    except Exception as e:
        logger.error(f"❌ Problema nas tabelas: {e}")
        return False


def create_default_data():
    """Criar dados padrão do sistema"""
    if not check_database_integrity():
        logger.warning("⚠️ Problemas detectados no banco de dados!")
        return False

    # Criar usuário admin padrão apenas se não existir
    admin = db.session.query(User).filter_by(email='admin@gedo.com').first()
    if not admin:
        admin = User(
            username='admin',
            email='admin@gedo.com',
            password='admin123',  # Senha simples para teste
            role='administrador',
            must_change_password=False  # Para facilitar o teste inicial
        )
        db.session.add(admin)
        logger.info("✅ Usuário admin criado")
        logger.info("📧 Email: admin@gedo.com")
        logger.info("🔑 Senha: admin123")
    else:
        logger.info("ℹ️ Usuário admin já existe")

    # Criar tipos de registro padrão
    tipos_padrao = [
        "Aditivo", "ART", "Ata", "Carta Preposto", "Contrato", "Croqui", "E-mail",
        "Especificação Técnica", "Ficha de Verificação", "Memorial Descritivo",
        "Memorando / Ofício / Correspondência", "Notificação", "Ordens de Serviço",
        "Plano de Ataque", "Plano de Ação", "RDO", "Relatório", "Seguro",
        "SIT / NAP / QTO", "Termo de Entrega Definitivo", "Termo de Entrega Provisória"
    ]

    for tipo_nome in tipos_padrao:
        tipo_existente = db.session.query(
            TipoRegistro).filter_by(nome=tipo_nome).first()
        if not tipo_existente:
            tipo = TipoRegistro(
                nome=tipo_nome,
                descricao=f'Tipo de registro: {tipo_nome}'
            )
            db.session.add(tipo)

    # NOVO: Criar classificações padrão
    classificacoes_padrao = [
        # Atividades em Campo
        ("Atividades em Campo", "Aceleração de Atividades"),
        ("Atividades em Campo", "Atividade em Campo"),
        ("Atividades em Campo", "Autorização de Início de Atividade"),
        ("Atividades em Campo", "Fim de Atividade"),
        ("Atividades em Campo", "Início de Atividade"),
        ("Atividades em Campo", "Paralisação de Atividade"),
        ("Atividades em Campo", "Realocação de Equipe"),
        ("Atividades em Campo", "Retomada de Atividade"),
        ("Atividades em Campo", "Suspensão de Atividade"),

        # Mobilização e Desmobilização
        ("Mobilização e Desmobilização", "Desmobilização"),
        ("Mobilização e Desmobilização", "Início da Mobilização"),
        ("Mobilização e Desmobilização", "Mobilização"),

        # Recursos e Logística
        ("Recursos e Logística", "Atraso na Entrega de Materiais Contratada"),
        ("Recursos e Logística", "Atraso na Entrega de Materiais Contratante"),
        ("Recursos e Logística", "Dificuldade no Transporte de Mão de Obra"),
        ("Recursos e Logística", "Entrega de Materiais/Equipamentos"),
        ("Recursos e Logística", "Falta de Materiais/Equipamentos"),
        ("Recursos e Logística", "Falta de Recursos Humanos"),
        ("Recursos e Logística", "Material fora dos padrões Contratada"),
        ("Recursos e Logística", "Material fora dos padrões Contratante"),

        # Planejamento, Documentos e Licenças
        ("Planejamento, Documentos e Licenças", "Assinatura de Ordem de Serviço"),
        ("Planejamento, Documentos e Licenças", "Data Prevista para Atividade"),
        ("Planejamento, Documentos e Licenças", "Entrega de Documentação"),
        ("Planejamento, Documentos e Licenças", "Entrega de Plano"),
        ("Planejamento, Documentos e Licenças", "Entrega de Projeto"),
        ("Planejamento, Documentos e Licenças", "Falta de Autorização"),
        ("Planejamento, Documentos e Licenças", "Falta de Licença"),
        ("Planejamento, Documentos e Licenças", "Falta de Projeto"),
        ("Planejamento, Documentos e Licenças", "Inconsistência de Projeto"),
        ("Planejamento, Documentos e Licenças", "Solicitação de Plano"),

        # Condições Externas e Interferências
        ("Condições Externas e Interferências", "Chuvas e Impactos"),
        ("Condições Externas e Interferências",
         "COVID-19: Afastamento ou Impactos"),
        ("Condições Externas e Interferências", "Interferências Externas"),
        ("Condições Externas e Interferências", "Má Condição de Acesso"),
        ("Condições Externas e Interferências", "Roubo ou Furto"),

        # Desempenho, Qualidade e Anomalias
        ("Desempenho, Qualidade e Anomalias", "Atraso na Mobilização Contratada"),
        ("Desempenho, Qualidade e Anomalias", "Atraso na Mobilização Contratante"),
        ("Desempenho, Qualidade e Anomalias", "Atraso nas Atividades em Campo"),
        ("Desempenho, Qualidade e Anomalias", "Baixa Produtividade"),
        ("Desempenho, Qualidade e Anomalias", "DDS"),
        ("Desempenho, Qualidade e Anomalias", "Extraescopo / Aditivo"),
        ("Desempenho, Qualidade e Anomalias", "Manutenção"),
        ("Desempenho, Qualidade e Anomalias", "Manutenção Periódica"),
        ("Desempenho, Qualidade e Anomalias", "Retrabalho"),

        # Gestão Contratual e Relacionamento
        ("Gestão Contratual e Relacionamento", "Análise pela Contratada"),
        ("Gestão Contratual e Relacionamento", "Aprovação pelo Contratante"),
        ("Gestão Contratual e Relacionamento", "Discordância do Contratante"),
        ("Gestão Contratual e Relacionamento", "Divergência em Informação de RDO"),
        ("Gestão Contratual e Relacionamento", "Pendências"),
        ("Gestão Contratual e Relacionamento", "Solicitação da Contratada"),
        ("Gestão Contratual e Relacionamento", "Solicitação do Contratante"),

        # Administração e Monitoramento
        ("Administração e Monitoramento",
         "Abertura de PTS (Permissão de Trabalho Seguro)"),
        ("Administração e Monitoramento", "Informação Geral"),
        ("Administração e Monitoramento", "RDO em Atraso"),
        ("Administração e Monitoramento", "Reunião"),
    ]

    for grupo, subgrupo in classificacoes_padrao:
        classificacao_existente = db.session.query(Classificacao).filter_by(
            grupo=grupo, subgrupo=subgrupo).first()
        if not classificacao_existente:
            classificacao = Classificacao(grupo=grupo, subgrupo=subgrupo)
            db.session.add(classificacao)

    try:
        db.session.commit()
        init_configuracoes()
        return True
    except Exception as e:
        logger.error(f"Erro ao criar dados padrão: {e}")
        db.session.rollback()
        return False


def create_database_directory():
    """Criar diretório do banco de dados se não existir"""
    db_dir = os.path.join(os.path.dirname(__file__), 'database')
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        logger.info(f"📁 Diretório do banco criado: {db_dir}")


# Criar aplicação
app = create_app()

# Inicialização do banco de dados
with app.app_context():
    create_database_directory()
    db.create_all()
    logger.info("🗄️ Tabelas do banco de dados criadas/verificadas")

    # NOVO: Executar migração das colunas Blob
    migrate_blob_columns()

    # NOVO: Executar migração das colunas de Classificação
    migrate_classificacao_columns()

    if create_default_data():
        logger.info("📊 Dados padrão inicializados")
        logger.info("✅ Sistema GEDO CIMCOP inicializado com sucesso!")
        logger.info("")
        logger.info("🔑 CREDENCIAIS DE LOGIN:")
        logger.info("   Email: admin@gedo.com")
        logger.info("   Senha: admin123")
    else:
        logger.warning("⚠️ Sistema iniciado com problemas no banco de dados")


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Servir arquivos estáticos do frontend"""
    static_folder_path = app.static_folder
    if path and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    index_path = os.path.join(static_folder_path, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(static_folder_path, 'index.html')
    return "GEDO CIMCOP - Sistema de Gerenciamento de Documentos e Registros de Obras", 200


@app.route('/api/health', methods=['GET'])
def health_check():
    """Verificação de saúde da API"""
    return {
        'status': 'ok',
        'message': 'GEDO CIMCOP API está funcionando',
        'version': '1.0.0',
        'environment': os.getenv('FLASK_ENV', 'development'),
        'cors_enabled': True,
        'vercel_blob_enabled': bool(os.getenv('BLOB_READ_WRITE_TOKEN')),
        'features': [
            'Autenticação',
            'Gestão de Obras',
            'Registros de Documentos',
            'Pesquisa Avançada',
            'Dashboard',
            'Configurações',
            'Importação em Lote',
            'Reset de Senha',
            'Vercel Blob Storage',
            'Sistema de Classificação'
        ]
    }, 200


if __name__ == '__main__':
    # Debug: Mostrar todas as rotas registradas
    with app.app_context():
        logger.info("\n🔍 ROTAS REGISTRADAS:")
        for rule in app.url_map.iter_rules():
            methods = ', '.join(rule.methods - {'HEAD', 'OPTIONS'})
            logger.info(f"  {methods:15} {rule.rule}")

    logger.info("🚀 Iniciando servidor GEDO CIMCOP...")
    logger.info("📍 Acesse: http://localhost:5000")
    logger.info("🔧 API Health Check: http://localhost:5000/api/health")

    # Configurações de desenvolvimento
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('FLASK_ENV') == 'development'
    )
