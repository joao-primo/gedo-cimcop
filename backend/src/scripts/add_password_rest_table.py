from flask import Flask
from models.password_reset import PasswordResetToken
from models.user import db
import sys
import os

# Adicionar path do projeto
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


def create_app():
    """Criar aplicação Flask para migração"""
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'migration-key'
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(os.path.dirname(__file__), '..', 'src', 'database', 'app.db')}"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    return app


def main():
    """Executar migração"""
    app = create_app()

    with app.app_context():
        try:
            # Criar apenas a nova tabela
            db.create_all()
            print("✅ Tabela password_reset_tokens criada com sucesso!")

            # Verificar se a tabela foi criada
            result = db.engine.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='password_reset_tokens';")
            if result.fetchone():
                print("✅ Verificação: Tabela existe no banco de dados")
            else:
                print("❌ Erro: Tabela não foi criada")

        except Exception as e:
            print(f"❌ Erro na migração: {e}")


if __name__ == '__main__':
    main()
