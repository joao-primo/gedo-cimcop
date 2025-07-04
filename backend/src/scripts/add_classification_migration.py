#!/usr/bin/env python3
"""
Script para adicionar colunas de classificação à tabela registros
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def get_db_connection():
    """Conectar ao banco de dados"""
    try:
        # Tentar variáveis de ambiente do Render primeiro
        database_url = os.getenv('DATABASE_URL')

        if database_url:
            print("🔗 Conectando usando DATABASE_URL...")
            conn = psycopg2.connect(database_url)
        else:
            # Fallback para variáveis individuais
            print("🔗 Conectando usando variáveis individuais...")
            conn = psycopg2.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=os.getenv('DB_PORT', '5432'),
                database=os.getenv('DB_NAME', 'gedo_db'),
                user=os.getenv('DB_USER', 'postgres'),
                password=os.getenv('DB_PASSWORD', 'postgres')
            )

        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("✅ Conexão estabelecida com sucesso!")
        return conn

    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {str(e)}")
        return None


def check_column_exists(cursor, table_name, column_name):
    """Verificar se uma coluna existe na tabela"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s
        );
    """, (table_name, column_name))
    return cursor.fetchone()[0]


def add_classification_columns():
    """Adicionar colunas de classificação"""
    conn = get_db_connection()
    if not conn:
        return False

    try:
        cursor = conn.cursor()

        print("🔍 Verificando estrutura atual da tabela registros...")

        # Verificar se as colunas já existem
        has_grupo = check_column_exists(
            cursor, 'registros', 'classificacao_grupo')
        has_subgrupo = check_column_exists(
            cursor, 'registros', 'classificacao_subgrupo')

        print(f"   - classificacao_grupo existe: {has_grupo}")
        print(f"   - classificacao_subgrupo existe: {has_subgrupo}")

        changes_made = False

        # Adicionar coluna classificacao_grupo se não existir
        if not has_grupo:
            print("➕ Adicionando coluna classificacao_grupo...")
            cursor.execute("""
                ALTER TABLE registros 
                ADD COLUMN classificacao_grupo VARCHAR(100);
            """)
            print("✅ Coluna classificacao_grupo adicionada!")
            changes_made = True
        else:
            print("ℹ️  Coluna classificacao_grupo já existe")

        # Adicionar coluna classificacao_subgrupo se não existir
        if not has_subgrupo:
            print("➕ Adicionando coluna classificacao_subgrupo...")
            cursor.execute("""
                ALTER TABLE registros 
                ADD COLUMN classificacao_subgrupo VARCHAR(100);
            """)
            print("✅ Coluna classificacao_subgrupo adicionada!")
            changes_made = True
        else:
            print("ℹ️  Coluna classificacao_subgrupo já existe")

        # Criar índices para melhor performance
        if changes_made:
            print("📊 Criando índices para otimização...")

            # Índice para classificacao_grupo
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_registros_classificacao_grupo 
                    ON registros(classificacao_grupo);
                """)
                print("✅ Índice para classificacao_grupo criado!")
            except Exception as e:
                print(f"⚠️  Aviso ao criar índice grupo: {str(e)}")

            # Índice para classificacao_subgrupo
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_registros_classificacao_subgrupo 
                    ON registros(classificacao_subgrupo);
                """)
                print("✅ Índice para classificacao_subgrupo criado!")
            except Exception as e:
                print(f"⚠️  Aviso ao criar índice subgrupo: {str(e)}")

            # Índice composto
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_registros_classificacao_completa 
                    ON registros(classificacao_grupo, classificacao_subgrupo);
                """)
                print("✅ Índice composto criado!")
            except Exception as e:
                print(f"⚠️  Aviso ao criar índice composto: {str(e)}")

        # Verificar estrutura final
        print("\n🔍 Verificando estrutura final...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'registros' 
            AND column_name LIKE '%classificacao%'
            ORDER BY column_name;
        """)

        columns = cursor.fetchall()
        if columns:
            print("📋 Colunas de classificação encontradas:")
            for col_name, data_type, nullable in columns:
                print(f"   - {col_name}: {data_type} (nullable: {nullable})")
        else:
            print("⚠️  Nenhuma coluna de classificação encontrada")

        cursor.close()
        conn.close()

        if changes_made:
            print("\n🎉 Migração concluída com sucesso!")
        else:
            print("\n✅ Estrutura já estava atualizada!")

        return True

    except Exception as e:
        print(f"❌ Erro durante a migração: {str(e)}")
        if conn:
            conn.close()
        return False


def populate_default_classifications():
    """Popular classificações padrão se necessário"""
    conn = get_db_connection()
    if not conn:
        return False

    try:
        cursor = conn.cursor()

        print("\n📊 Verificando se há registros sem classificação...")
        cursor.execute("""
            SELECT COUNT(*) FROM registros 
            WHERE classificacao_grupo IS NULL OR classificacao_grupo = '';
        """)

        count_sem_classificacao = cursor.fetchone()[0]
        print(f"   - Registros sem classificação: {count_sem_classificacao}")

        if count_sem_classificacao > 0:
            print("🔄 Aplicando classificação padrão...")
            cursor.execute("""
                UPDATE registros 
                SET 
                    classificacao_grupo = 'Geral',
                    classificacao_subgrupo = 'Não Classificado'
                WHERE classificacao_grupo IS NULL OR classificacao_grupo = '';
            """)

            print(
                f"✅ {count_sem_classificacao} registros atualizados com classificação padrão!")
        else:
            print("ℹ️  Todos os registros já possuem classificação")

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        print(f"❌ Erro ao popular classificações padrão: {str(e)}")
        if conn:
            conn.close()
        return False


def main():
    """Função principal"""
    print("🚀 Iniciando migração de classificações...")
    print("=" * 50)

    # Adicionar colunas
    if not add_classification_columns():
        print("❌ Falha na migração das colunas")
        sys.exit(1)

    # Popular classificações padrão
    if not populate_default_classifications():
        print("⚠️  Aviso: Falha ao popular classificações padrão")

    print("\n" + "=" * 50)
    print("🎉 Migração de classificações concluída!")
    print("\nPróximos passos:")
    print("1. Reinicie o backend para aplicar as mudanças")
    print("2. Teste a funcionalidade de classificação no frontend")
    print("3. Verifique se os dados estão sendo salvos corretamente")


if __name__ == "__main__":
    main()
