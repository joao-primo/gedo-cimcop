#!/usr/bin/env python3
"""
Script para adicionar colunas de classificação à tabela registros
e popular com classificações padrão
"""

from backend.src import create_app, db
from sqlalchemy import text, inspect
import logging
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_column_exists(table_name, column_name):
    """Verificar se uma coluna existe na tabela"""
    try:
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception as e:
        logger.error(f"Erro ao verificar coluna {column_name}: {str(e)}")
        return False


def add_classification_columns():
    """Adicionar colunas de classificação se não existirem"""
    try:
        # Verificar se as colunas já existem
        grupo_exists = check_column_exists('registros', 'classificacao_grupo')
        subgrupo_exists = check_column_exists(
            'registros', 'classificacao_subgrupo')

        if not grupo_exists:
            logger.info("Adicionando coluna classificacao_grupo...")
            db.session.execute(text("""
                ALTER TABLE registros 
                ADD COLUMN classificacao_grupo VARCHAR(100)
            """))
            logger.info("Coluna classificacao_grupo adicionada com sucesso")
        else:
            logger.info("Coluna classificacao_grupo já existe")

        if not subgrupo_exists:
            logger.info("Adicionando coluna classificacao_subgrupo...")
            db.session.execute(text("""
                ALTER TABLE registros 
                ADD COLUMN classificacao_subgrupo VARCHAR(100)
            """))
            logger.info("Coluna classificacao_subgrupo adicionada com sucesso")
        else:
            logger.info("Coluna classificacao_subgrupo já existe")

        # Verificar se coluna anexos_count existe
        anexos_exists = check_column_exists('registros', 'anexos_count')
        if not anexos_exists:
            logger.info("Adicionando coluna anexos_count...")
            db.session.execute(text("""
                ALTER TABLE registros 
                ADD COLUMN anexos_count INTEGER DEFAULT 0
            """))
            logger.info("Coluna anexos_count adicionada com sucesso")
        else:
            logger.info("Coluna anexos_count já existe")

        db.session.commit()
        return True

    except Exception as e:
        logger.error(f"Erro ao adicionar colunas: {str(e)}")
        db.session.rollback()
        return False


def create_classifications_table():
    """Criar tabela de classificações se não existir"""
    try:
        # Verificar se a tabela já existe
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()

        if 'classificacoes' not in tables:
            logger.info("Criando tabela classificacoes...")
            db.session.execute(text("""
                CREATE TABLE classificacoes (
                    id SERIAL PRIMARY KEY,
                    grupo VARCHAR(100) NOT NULL,
                    subgrupo VARCHAR(100) NOT NULL,
                    descricao TEXT,
                    ativo BOOLEAN DEFAULT TRUE,
                    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(grupo, subgrupo)
                )
            """))
            logger.info("Tabela classificacoes criada com sucesso")
        else:
            logger.info("Tabela classificacoes já existe")

        db.session.commit()
        return True

    except Exception as e:
        logger.error(f"Erro ao criar tabela classificacoes: {str(e)}")
        db.session.rollback()
        return False


def insert_default_classifications():
    """Inserir classificações padrão"""
    try:
        # Verificar se já existem classificações
        result = db.session.execute(
            text("SELECT COUNT(*) FROM classificacoes")).scalar()

        if result > 0:
            logger.info("Classificações já existem na tabela")
            return True

        logger.info("Inserindo classificações padrão...")

        classificacoes_padrao = [
            ('Estrutural', 'Fundação', 'Elementos de fundação da estrutura'),
            ('Estrutural', 'Pilares', 'Elementos verticais de sustentação'),
            ('Estrutural', 'Vigas', 'Elementos horizontais de sustentação'),
            ('Estrutural', 'Lajes', 'Elementos de cobertura horizontal'),
            ('Arquitetônico', 'Fachada', 'Elementos da fachada do edifício'),
            ('Arquitetônico', 'Interiores', 'Elementos internos do edifício'),
            ('Arquitetônico', 'Cobertura', 'Elementos de cobertura'),
            ('Instalações', 'Elétrica', 'Instalações elétricas'),
            ('Instalações', 'Hidráulica', 'Instalações hidráulicas'),
            ('Instalações', 'Ar Condicionado', 'Sistema de climatização'),
            ('Acabamento', 'Pintura', 'Serviços de pintura'),
            ('Acabamento', 'Revestimento', 'Revestimentos diversos'),
            ('Acabamento', 'Piso', 'Pavimentação e pisos'),
            ('Segurança', 'Proteção', 'Elementos de proteção e segurança'),
            ('Segurança', 'Sinalização', 'Sinalização de segurança'),
            ('Paisagismo', 'Jardim', 'Elementos de paisagismo'),
            ('Paisagismo', 'Irrigação', 'Sistema de irrigação'),
            ('Documentação', 'Projeto', 'Documentos de projeto'),
            ('Documentação', 'Licenças', 'Licenças e aprovações'),
            ('Qualidade', 'Inspeção', 'Registros de inspeção'),
            ('Qualidade', 'Teste', 'Registros de testes e ensaios')
        ]

        for grupo, subgrupo, descricao in classificacoes_padrao:
            db.session.execute(text("""
                INSERT INTO classificacoes (grupo, subgrupo, descricao)
                VALUES (:grupo, :subgrupo, :descricao)
                ON CONFLICT (grupo, subgrupo) DO NOTHING
            """), {
                'grupo': grupo,
                'subgrupo': subgrupo,
                'descricao': descricao
            })

        db.session.commit()
        logger.info(
            f"Inseridas {len(classificacoes_padrao)} classificações padrão")
        return True

    except Exception as e:
        logger.error(f"Erro ao inserir classificações padrão: {str(e)}")
        db.session.rollback()
        return False


def update_existing_records():
    """Atualizar registros existentes com classificações padrão"""
    try:
        # Verificar se existem registros sem classificação
        result = db.session.execute(text("""
            SELECT COUNT(*) FROM registros 
            WHERE classificacao_grupo IS NULL OR classificacao_grupo = ''
        """)).scalar()

        if result == 0:
            logger.info("Todos os registros já possuem classificação")
            return True

        logger.info(f"Atualizando {result} registros sem classificação...")

        # Atualizar registros baseado no tipo de registro
        db.session.execute(text("""
            UPDATE registros 
            SET classificacao_grupo = 'Documentação',
                classificacao_subgrupo = 'Projeto'
            WHERE (classificacao_grupo IS NULL OR classificacao_grupo = '')
            AND tipo_registro_id IN (
                SELECT id FROM tipos_registro 
                WHERE nome ILIKE '%projeto%' OR nome ILIKE '%desenho%'
            )
        """))

        db.session.execute(text("""
            UPDATE registros 
            SET classificacao_grupo = 'Qualidade',
                classificacao_subgrupo = 'Inspeção'
            WHERE (classificacao_grupo IS NULL OR classificacao_grupo = '')
            AND tipo_registro_id IN (
                SELECT id FROM tipos_registro 
                WHERE nome ILIKE '%inspeção%' OR nome ILIKE '%vistoria%'
            )
        """))

        # Para registros restantes, usar classificação genérica
        db.session.execute(text("""
            UPDATE registros 
            SET classificacao_grupo = 'Documentação',
                classificacao_subgrupo = 'Projeto'
            WHERE classificacao_grupo IS NULL OR classificacao_grupo = ''
        """))

        # Atualizar anexos_count para 0 onde for NULL
        db.session.execute(text("""
            UPDATE registros 
            SET anexos_count = 0 
            WHERE anexos_count IS NULL
        """))

        db.session.commit()
        logger.info("Registros existentes atualizados com sucesso")
        return True

    except Exception as e:
        logger.error(f"Erro ao atualizar registros existentes: {str(e)}")
        db.session.rollback()
        return False


def main():
    """Função principal do script"""
    logger.info("=== INICIANDO MIGRAÇÃO DE CLASSIFICAÇÕES ===")

    app = create_app()

    with app.app_context():
        try:
            # 1. Adicionar colunas de classificação
            logger.info(
                "1. Verificando/adicionando colunas de classificação...")
            if not add_classification_columns():
                logger.error("Falha ao adicionar colunas de classificação")
                return False

            # 2. Criar tabela de classificações
            logger.info("2. Verificando/criando tabela de classificações...")
            if not create_classifications_table():
                logger.error("Falha ao criar tabela de classificações")
                return False

            # 3. Inserir classificações padrão
            logger.info("3. Inserindo classificações padrão...")
            if not insert_default_classifications():
                logger.error("Falha ao inserir classificações padrão")
                return False

            # 4. Atualizar registros existentes
            logger.info("4. Atualizando registros existentes...")
            if not update_existing_records():
                logger.error("Falha ao atualizar registros existentes")
                return False

            logger.info("=== MIGRAÇÃO CONCLUÍDA COM SUCESSO ===")
            return True

        except Exception as e:
            logger.error(f"Erro geral na migração: {str(e)}")
            return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
