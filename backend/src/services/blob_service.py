"""
Serviço para gerenciar uploads usando Vercel Blob
"""
import os
import uuid
import requests
from werkzeug.utils import secure_filename
from flask import current_app


class BlobService:
    def __init__(self):
        self.blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
        self.base_url = 'https://blob.vercel-storage.com'

    def upload_file(self, file, folder='uploads'):
        """Upload de arquivo para Vercel Blob"""
        if not self.blob_token:
            raise Exception("BLOB_READ_WRITE_TOKEN não configurado")

        if not file or not file.filename:
            return None

        # Gerar nome único mas preservar extensão
        filename = secure_filename(file.filename)
        file_extension = filename.rsplit(
            '.', 1)[1].lower() if '.' in filename else ''
        unique_filename = f"{folder}/{uuid.uuid4()}.{file_extension}" if file_extension else f"{folder}/{uuid.uuid4()}_{filename}"

        try:
            # ← CORREÇÃO CRÍTICA: Ler arquivo corretamente
            file.seek(0)  # Garantir que estamos no início
            file_data = file.read()
            file.seek(0)  # Reset para outras operações

            # ← CORREÇÃO: Detectar Content-Type correto
            content_type = file.content_type
            if not content_type:
                # Fallback baseado na extensão
                content_type_map = {
                    'pdf': 'application/pdf',
                    'doc': 'application/msword',
                    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'xls': 'application/vnd.ms-excel',
                    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'png': 'image/png',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'gif': 'image/gif',
                    'txt': 'text/plain'
                }
                content_type = content_type_map.get(
                    file_extension, 'application/octet-stream')

            current_app.logger.info(
                f"📤 UPLOAD: {filename} ({len(file_data)} bytes, {content_type})")

            # Upload para Vercel Blob com headers corretos
            response = requests.put(
                f"{self.base_url}/{unique_filename}",
                data=file_data,
                headers={
                    'Authorization': f'Bearer {self.blob_token}',
                    'Content-Type': content_type,
                    'Content-Length': str(len(file_data))
                },
                timeout=60  # ← ADICIONADO: Timeout maior para arquivos grandes
            )

            current_app.logger.info(f"📤 BLOB Response: {response.status_code}")

            if response.status_code == 200:
                blob_data = response.json()
                current_app.logger.info(
                    f"✅ UPLOAD SUCCESS: {blob_data['url']}")

                return {
                    'url': blob_data['url'],
                    'pathname': blob_data['pathname'],
                    'filename': filename,
                    'size': len(file_data),
                    'content_type': content_type,
                    'file_extension': file_extension
                }
            else:
                current_app.logger.error(
                    f"❌ UPLOAD ERROR: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            current_app.logger.error(f"❌ UPLOAD EXCEPTION: {str(e)}")
            return None

    def delete_file(self, pathname):
        """Deletar arquivo do Vercel Blob"""
        if not self.blob_token or not pathname:
            return False

        try:
            response = requests.delete(
                f"{self.base_url}/{pathname}",
                headers={
                    'Authorization': f'Bearer {self.blob_token}'
                },
                timeout=30
            )
            return response.status_code == 200
        except Exception as e:
            current_app.logger.error(f"❌ DELETE ERROR: {str(e)}")
            return False

    def get_file_info(self, pathname):
        """Obter informações do arquivo"""
        if not pathname:
            return None
        return f"{self.base_url}/{pathname}"


# Instância global
blob_service = BlobService()
