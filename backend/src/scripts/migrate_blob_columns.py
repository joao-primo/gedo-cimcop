"""
Script para adicionar colunas do Vercel Blob na tabela registros
"""
from sqlalchemy import text
from main import create_app
from models.user import db
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


def migrate_blob_columns():
    """Adiciona colunas do Vercel Blob se não existirem"""
    app = create_app('production')

    with app.app_context():
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
                print("➕ Adicionando coluna blob_url...")
                db.session.execute(text("""
                    ALTER TABLE registros 
                    ADD COLUMN blob_url VARCHAR(500)
                """))
                print("✅ Coluna blob_url adicionada")
            else:
                print("ℹ️ Coluna blob_url já existe")

            # Adicionar blob_pathname se não existir
            if 'blob_pathname' not in existing_columns:
                print("➕ Adicionando coluna blob_pathname...")
                db.session.execute(text("""
                    ALTER TABLE registros 
                    ADD COLUMN blob_pathname VARCHAR(500)
                """))
                print("✅ Coluna blob_pathname adicionada")
            else:
                print("ℹ️ Coluna blob_pathname já existe")

            # Commit das alterações
            db.session.commit()
            print("🎉 Migração concluída com sucesso!")

        except Exception as e:
            print(f"❌ Erro na migração: {str(e)}")
            db.session.rollback()
            return False

    return True


if __name__ == '__main__':
    print("🚀 Iniciando migração das colunas do Vercel Blob...")
    success = migrate_blob_columns()
    if success:
        print("✅ Migração executada com sucesso!")
    else:
        print("❌ Falha na migração!")
        sys.exit(1)
