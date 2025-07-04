"""
Script para adicionar migração de classificação ao banco de dados
Este script deve ser executado para adicionar as colunas de classificação
"""

from backend.src.config import Config
import os
import sys
import psycopg2
from datetime import datetime

# Adicionar o diretório pai ao path para importar módulos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_classification_migration():
    """Executa a migração para adicionar colunas de classificação"""

    try:
        # Conectar ao banco
        conn = psycopg2.connect(Config.DATABASE_URL)
        cursor = conn.cursor()

        print("Iniciando migração de classificação...")

        # 1. Criar tabela de classificações se não existir
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS classificacoes (
                id SERIAL PRIMARY KEY,
                grupo VARCHAR(100) NOT NULL,
                subgrupo VARCHAR(200) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(grupo, subgrupo)
            );
        """)

        # 2. Adicionar colunas de classificação na tabela registros se não existirem
        cursor.execute("""
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='registros' AND column_name='classificacao_grupo') THEN
                    ALTER TABLE registros ADD COLUMN classificacao_grupo VARCHAR(100);
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='registros' AND column_name='classificacao_subgrupo') THEN
                    ALTER TABLE registros ADD COLUMN classificacao_subgrupo VARCHAR(200);
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='registros' AND column_name='classificacao_id') THEN
                    ALTER TABLE registros ADD COLUMN classificacao_id INTEGER REFERENCES classificacoes(id);
                END IF;
            END $$;
        """)

        # 3. Inserir dados padrão de classificação
        classificacoes_data = [
            # 1. Atividades em Campo
            ("Atividades em Campo", "Aceleração de Atividades"),
            ("Atividades em Campo", "Atividade em Campo"),
            ("Atividades em Campo", "Autorização de Início de Atividade"),
            ("Atividades em Campo", "Fim de Atividade"),
            ("Atividades em Campo", "Início de Atividade"),
            ("Atividades em Campo", "Paralisação de Atividade"),
            ("Atividades em Campo", "Realocação de Equipe"),
            ("Atividades em Campo", "Retomada de Atividade"),
            ("Atividades em Campo", "Suspensão de Atividade"),

            # 2. Mobilização e Desmobilização
            ("Mobilização e Desmobilização", "Desmobilização"),
            ("Mobilização e Desmobilização", "Início da Mobilização"),
            ("Mobilização e Desmobilização", "Mobilização"),

            # 3. Recursos e Logística
            ("Recursos e Logística",
             "Atraso na Entrega de Materiais Contratada/Contratante"),
            ("Recursos e Logística", "Dificuldade no Transporte de Mão de Obra"),
            ("Recursos e Logística", "Entrega de Materiais/Equipamentos"),
            ("Recursos e Logística", "Falta de Materiais/Equipamentos"),
            ("Recursos e Logística", "Falta de Recursos Humanos"),
            ("Recursos e Logística", "Material fora dos padrões Contratada/Contratante"),

            # 4. Planejamento, Documentos e Licenças
            ("Planejamento, Documentos e Licenças",
             "Assinatura de Ordem de Serviço"),
            ("Planejamento, Documentos e Licenças", "Data Prevista para Atividade"),
            ("Planejamento, Documentos e Licenças",
             "Entrega de Documentação/Plano/Projeto"),
            ("Planejamento, Documentos e Licenças",
             "Falta de Autorização/Licença/Projeto"),
            ("Planejamento, Documentos e Licenças", "Inconsistência de Projeto"),
            ("Planejamento, Documentos e Licenças", "Solicitação de Plano"),

            # 5. Condições Externas e Interferências
            ("Condições Externas e Interferências", "Chuvas"),
            ("Condições Externas e Interferências", "COVID-19"),
            ("Condições Externas e Interferências", "Interferências"),
            ("Condições Externas e Interferências", "Má Condição de Acesso"),
            ("Condições Externas e Interferências", "Roubo ou Furto"),

            # 6. Desempenho, Qualidade e Anomalias
            ("Desempenho, Qualidade e Anomalias", "Atraso na Mobilização"),
            ("Desempenho, Qualidade e Anomalias", "Atraso nas Atividades"),
            ("Desempenho, Qualidade e Anomalias", "Baixa Produtividade"),
            ("Desempenho, Qualidade e Anomalias", "DDS"),
            ("Desempenho, Qualidade e Anomalias", "Extraescopo"),
            ("Desempenho, Qualidade e Anomalias", "Manutenção"),
            ("Desempenho, Qualidade e Anomalias", "Retrabalho"),

            # 7. Gestão Contratual e Relacionamento
            ("Gestão Contratual e Relacionamento", "Análise"),
            ("Gestão Contratual e Relacionamento", "Aprovação"),
            ("Gestão Contratual e Relacionamento", "Discordância"),
            ("Gestão Contratual e Relacionamento", "Divergência no RDO"),
            ("Gestão Contratual e Relacionamento", "Pendências"),
            ("Gestão Contratual e Relacionamento", "Solicitações"),

            # 8. Administração e Monitoramento
            ("Administração e Monitoramento", "Abertura de PTS"),
            ("Administração e Monitoramento", "Informação Geral"),
            ("Administração e Monitoramento", "RDO em Atraso"),
            ("Administração e Monitoramento", "Reunião"),
        ]

        # Inserir classificações (ignorar duplicatas)
        for grupo, subgrupo in classificacoes_data:
            cursor.execute("""
                INSERT INTO classificacoes (grupo, subgrupo) 
                VALUES (%s, %s) 
                ON CONFLICT (grupo, subgrupo) DO NOTHING
            """, (grupo, subgrupo))

        # 4. Criar índices para melhor performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_registros_classificacao_grupo 
            ON registros(classificacao_grupo);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_registros_classificacao_id 
            ON registros(classificacao_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_classificacoes_grupo 
            ON classificacoes(grupo);
        """)

        # Commit das alterações
        conn.commit()

        # Verificar quantas classificações foram inseridas
        cursor.execute("SELECT COUNT(*) FROM classificacoes")
        total_classificacoes = cursor.fetchone()[0]

        print(f"✅ Migração de classificação concluída com sucesso!")
        print(f"📊 Total de classificações disponíveis: {total_classificacoes}")
        print(
            f"🕒 Executado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"❌ Erro durante a migração: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False


if __name__ == "__main__":
    print("🚀 Executando migração de classificação...")
    success = run_classification_migration()

    if success:
        print("\n✅ Migração executada com sucesso!")
        print("O sistema agora suporta classificação de registros.")
    else:
        print("\n❌ Falha na migração!")
        print("Verifique os logs de erro acima.")
        sys.exit(1)
