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

        # Gerar nome único
        filename = secure_filename(file.filename)
        unique_filename = f"{folder}/{uuid.uuid4()}_{filename}"

        try:
            # Preparar dados para upload
            file_data = file.read()
            file.seek(0)  # Reset file pointer

            # Upload para Vercel Blob
            response = requests.put(
                f"{self.base_url}/{unique_filename}",
                data=file_data,
                headers={
                    'Authorization': f'Bearer {self.blob_token}',
                    'Content-Type': file.content_type or 'application/octet-stream'
                }
            )

            if response.status_code == 200:
                blob_data = response.json()
                return {
                    'url': blob_data['url'],
                    'pathname': blob_data['pathname'],
                    'filename': filename,
                    'size': len(file_data),
                    'content_type': file.content_type
                }
            else:
                current_app.logger.error(f"Erro no upload: {response.text}")
                return None

        except Exception as e:
            current_app.logger.error(f"Erro no upload para Blob: {str(e)}")
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
                }
            )
            return response.status_code == 200
        except Exception as e:
            current_app.logger.error(f"Erro ao deletar arquivo: {str(e)}")
            return False

    def get_download_url(self, pathname):
        """Obter URL de download direto"""
        if not pathname:
            return None
        return f"{self.base_url}/{pathname}"


# Instância global
blob_service = BlobService()
