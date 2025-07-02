import os
import shutil
import sqlite3
import zipfile
from datetime import datetime, timedelta
import logging
import json

logger = logging.getLogger(__name__)


class BackupManager:
    """Gerenciador de backup do sistema"""

    def __init__(self, app=None):
        self.app = app
        self.backup_dir = 'backups'
        self.retention_days = 30

        if app:
            self.init_app(app)

    def init_app(self, app):
        """Inicializa o gerenciador com a aplicação Flask"""
        self.app = app
        self.backup_dir = app.config.get('BACKUP_DIR', 'backups')
        self.retention_days = app.config.get('BACKUP_RETENTION_DAYS', 30)

        # Criar diretório de backup se não existir
        os.makedirs(self.backup_dir, exist_ok=True)

    def create_database_backup(self):
        """Cria backup do banco de dados"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f'database_backup_{timestamp}.db'
            backup_path = os.path.join(self.backup_dir, backup_filename)

            # Para SQLite, simplesmente copiar o arquivo
            db_path = 'src/database/app.db'
            if os.path.exists(db_path):
                shutil.copy2(db_path, backup_path)
                logger.info(f"Backup do banco criado: {backup_path}")
                return backup_path
            else:
                logger.error(f"Arquivo do banco não encontrado: {db_path}")
                return None

        except Exception as e:
            logger.error(f"Erro ao criar backup do banco: {e}")
            return None

    def create_files_backup(self):
        """Cria backup dos arquivos de upload"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f'files_backup_{timestamp}.zip'
            backup_path = os.path.join(self.backup_dir, backup_filename)

            uploads_dir = 'src/uploads'
            if os.path.exists(uploads_dir):
                with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for root, dirs, files in os.walk(uploads_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, uploads_dir)
                            zipf.write(file_path, arcname)

                logger.info(f"Backup dos arquivos criado: {backup_path}")
                return backup_path
            else:
                logger.warning(
                    f"Diretório de uploads não encontrado: {uploads_dir}")
                return None

        except Exception as e:
            logger.error(f"Erro ao criar backup dos arquivos: {e}")
            return None

    def create_full_backup(self):
        """Cria backup completo (banco + arquivos)"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f'full_backup_{timestamp}.zip'
            backup_path = os.path.join(self.backup_dir, backup_filename)

            with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Backup do banco
                db_path = 'src/database/app.db'
                if os.path.exists(db_path):
                    zipf.write(db_path, 'database/app.db')

                # Backup dos uploads
                uploads_dir = 'src/uploads'
                if os.path.exists(uploads_dir):
                    for root, dirs, files in os.walk(uploads_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.join(
                                'uploads', os.path.relpath(file_path, uploads_dir))
                            zipf.write(file_path, arcname)

                # Backup das configurações
                config_data = {
                    'backup_date': datetime.now().isoformat(),
                    'version': '1.0.0',
                    'type': 'full_backup'
                }
                zipf.writestr('backup_info.json',
                              json.dumps(config_data, indent=2))

            logger.info(f"Backup completo criado: {backup_path}")
            return backup_path

        except Exception as e:
            logger.error(f"Erro ao criar backup completo: {e}")
            return None

    def cleanup_old_backups(self):
        """Remove backups antigos baseado na política de retenção"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.retention_days)
            removed_count = 0

            for filename in os.listdir(self.backup_dir):
                file_path = os.path.join(self.backup_dir, filename)

                if os.path.isfile(file_path):
                    file_time = datetime.fromtimestamp(
                        os.path.getctime(file_path))

                    if file_time < cutoff_date:
                        os.remove(file_path)
                        removed_count += 1
                        logger.info(f"Backup antigo removido: {filename}")

            if removed_count > 0:
                logger.info(
                    f"Limpeza concluída: {removed_count} backups antigos removidos")

            return removed_count

        except Exception as e:
            logger.error(f"Erro na limpeza de backups: {e}")
            return 0

    def list_backups(self):
        """Lista todos os backups disponíveis"""
        try:
            backups = []

            for filename in os.listdir(self.backup_dir):
                file_path = os.path.join(self.backup_dir, filename)

                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    backups.append({
                        'filename': filename,
                        'size': stat.st_size,
                        'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })

            # Ordenar por data de criação (mais recente primeiro)
            backups.sort(key=lambda x: x['created'], reverse=True)

            return backups

        except Exception as e:
            logger.error(f"Erro ao listar backups: {e}")
            return []

    def restore_database(self, backup_filename):
        """Restaura banco de dados a partir de backup"""
        try:
            backup_path = os.path.join(self.backup_dir, backup_filename)

            if not os.path.exists(backup_path):
                logger.error(
                    f"Arquivo de backup não encontrado: {backup_path}")
                return False

            db_path = 'src/database/app.db'

            # Fazer backup do banco atual antes de restaurar
            if os.path.exists(db_path):
                backup_current = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                shutil.copy2(db_path, backup_current)
                logger.info(f"Backup do banco atual criado: {backup_current}")

            # Restaurar o backup
            shutil.copy2(backup_path, db_path)
            logger.info(f"Banco restaurado a partir de: {backup_filename}")

            return True

        except Exception as e:
            logger.error(f"Erro ao restaurar banco: {e}")
            return False

    def get_backup_info(self, backup_filename):
        """Obtém informações detalhadas sobre um backup"""
        try:
            backup_path = os.path.join(self.backup_dir, backup_filename)

            if not os.path.exists(backup_path):
                return None

            stat = os.stat(backup_path)
            info = {
                'filename': backup_filename,
                'size': stat.st_size,
                'size_mb': round(stat.st_size / (1024 * 1024), 2),
                'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'type': 'unknown'
            }

            # Determinar tipo do backup pelo nome
            if 'database_backup' in backup_filename:
                info['type'] = 'database'
            elif 'files_backup' in backup_filename:
                info['type'] = 'files'
            elif 'full_backup' in backup_filename:
                info['type'] = 'full'

            # Se for um arquivo ZIP, tentar ler informações adicionais
            if backup_filename.endswith('.zip'):
                try:
                    with zipfile.ZipFile(backup_path, 'r') as zipf:
                        info['files_count'] = len(zipf.namelist())

                        # Tentar ler backup_info.json se existir
                        if 'backup_info.json' in zipf.namelist():
                            backup_info_data = zipf.read('backup_info.json')
                            backup_info = json.loads(
                                backup_info_data.decode('utf-8'))
                            info.update(backup_info)

                except Exception as e:
                    logger.warning(f"Erro ao ler informações do ZIP: {e}")

            return info

        except Exception as e:
            logger.error(f"Erro ao obter informações do backup: {e}")
            return None


# Instância global
backup_manager = BackupManager()
