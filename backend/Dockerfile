# Use Python 3.10 específico
FROM python:3.10.13-slim

# Definir diretório de trabalho
WORKDIR /app

# Copiar requirements primeiro (para cache do Docker)
COPY requirements.txt .

# Instalar dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Expor porta
EXPOSE 5000

# Comando para iniciar a aplicação
CMD ["python", "src/main.py"]
