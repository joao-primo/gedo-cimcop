#Modulo

# Script temporário para criar usuário de teste
if __name__ == "__main__":
    import sys
    import os
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    # Importar todos os modelos para resolver dependências de relacionamento
    from models.obra import Obra
    from models.registro import Registro
    from models.classificacao import Classificacao
    from models.tipo_registro import TipoRegistro
    from models.configuracao import Configuracao, ConfiguracaoUsuario
    from models.configuracao_workflow import ConfiguracaoWorkflow
    from models.password_reset import PasswordResetToken
    from models.audit_log import AuditLog
    from models.user import db, User
    from flask import Flask
    from config import config

    app = Flask(__name__)
    app.config.from_object(config['development'])
    db.init_app(app)

    with app.app_context():
        # Criar tabelas apenas se não existirem (apenas para dev/local)
        try:
            db.session.execute('SELECT 1 FROM users LIMIT 1')
        except Exception:
            print('Tabelas não encontradas, criando todas as tabelas...')
            db.create_all()

        email = "teste@gedo.com"
        username = "teste"
        password = "teste123"
        user = User.query.filter_by(email=email).first()
        if user:
            print(f"Usuário {email} já existe.")
        else:
            user = User(username=username, email=email, password=password, role='administrador')
            db.session.add(user)
            db.session.commit()
            print(f"Usuário {email} criado com sucesso!")
