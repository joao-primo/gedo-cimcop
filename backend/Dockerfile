# Dockerfile para o Backend GEDO CIMCOP
FROM python:3.11-slim

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fonte
COPY src/ ./src/

# Criar diretório para uploads
RUN mkdir -p uploads

# Criar diretório para banco de dados
RUN mkdir -p src/database

# Expor porta
EXPOSE 5000

# Definir variáveis de ambiente
ENV FLASK_APP=src/main.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app

# Comando para iniciar a aplicação
CMD ["python", "src/main.py"]

