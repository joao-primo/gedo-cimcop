# Guia de Instalação - GEDO CIMCOP

Este guia fornece instruções detalhadas para instalar e executar o Sistema GEDO CIMCOP.

## 📋 Pré-requisitos

### Para Execução Local
- Python 3.11 ou superior
- Node.js 20 ou superior
- pnpm (gerenciador de pacotes)
- Git

### Para Deploy com Docker
- Docker 20.10 ou superior
- Docker Compose 2.0 ou superior

## 🚀 Instalação Local (Desenvolvimento)

### 1. Clone o Repositório
```bash
git clone <url-do-repositorio>
cd gedo_cimcop
```

### 2. Configuração do Backend

```bash
# Navegar para o diretório do backend
cd backend

# Ativar o ambiente virtual (já criado pelo template)
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Instalar dependências (já instaladas pelo template)
pip install -r requirements.txt

# Configurar variáveis de ambiente (opcional)
cp .env.example .env
# Edite o arquivo .env conforme necessário

# Iniciar o servidor backend
python src/main.py
```

O backend estará disponível em: `http://localhost:5000`

### 3. Configuração do Frontend

```bash
# Em um novo terminal, navegar para o diretório do frontend
cd frontend

# Instalar dependências (já instaladas pelo template)
pnpm install

# Configurar variáveis de ambiente (opcional)
cp .env.example .env.local
# Edite o arquivo .env.local conforme necessário

# Iniciar o servidor de desenvolvimento
pnpm run dev
```

O frontend estará disponível em: `http://localhost:5173`

## 🐳 Instalação com Docker (Produção)

### 1. Clone o Repositório
```bash
git clone <url-do-repositorio>
cd gedo_cimcop
```

### 2. Configurar Variáveis de Ambiente

```bash
# Backend
cp backend/.env.example backend/.env
# Edite backend/.env com suas configurações

# Frontend
cp frontend/.env.example frontend/.env.local
# Edite frontend/.env.local com suas configurações
```

### 3. Executar com Docker Compose

```bash
# Construir e iniciar todos os serviços
docker-compose up -d

# Verificar status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Parar os serviços
docker-compose down
```

O sistema estará disponível em:
- Frontend: `http://localhost:80`
- Backend: `http://localhost:5000`

## 🔐 Primeiro Acesso

### Credenciais Padrão
- **Email**: admin@gedocimcop.com
- **Senha**: admin123

**⚠️ IMPORTANTE**: Altere essas credenciais após o primeiro login!

### Configuração Inicial
1. Acesse o sistema com as credenciais padrão
2. Vá para "Configurações" → "Usuários"
3. Altere a senha do administrador
4. Crie obras no sistema
5. Cadastre usuários padrão associados às obras
6. Configure tipos de registro conforme necessário

## 🔧 Configurações Avançadas

### Banco de Dados

#### SQLite (Padrão)
O sistema usa SQLite por padrão, que é criado automaticamente em `backend/src/database/app.db`.

#### PostgreSQL (Produção Recomendada)
Para usar PostgreSQL, altere a variável `DATABASE_URL` no arquivo `.env`:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/gedo_cimcop
```

### Upload de Arquivos

Por padrão, os arquivos são salvos em `backend/uploads/`. Para produção, considere:
- Configurar um storage externo (AWS S3, Google Cloud Storage)
- Aumentar o limite de tamanho de arquivo
- Implementar antivírus para uploads

### CORS e Segurança

O backend está configurado para aceitar requisições de:
- `http://localhost:3000` (desenvolvimento React)
- `http://127.0.0.1:3000`

Para produção, atualize as origens permitidas em `backend/src/main.py`.

## 🚨 Solução de Problemas

### Backend não inicia
```bash
# Verificar se o Python está na versão correta
python --version

# Verificar se as dependências estão instaladas
pip list

# Verificar logs de erro
python src/main.py
```

### Frontend não carrega
```bash
# Verificar se o Node.js está na versão correta
node --version

# Limpar cache e reinstalar dependências
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Verificar se o backend está rodando
curl http://localhost:5000/api/health
```

### Erro de CORS
- Verifique se o backend está configurado para aceitar requisições do frontend
- Confirme se as URLs estão corretas nos arquivos de configuração

### Problemas com Docker
```bash
# Verificar se o Docker está rodando
docker --version
docker-compose --version

# Limpar containers e imagens
docker-compose down
docker system prune -a

# Reconstruir as imagens
docker-compose build --no-cache
docker-compose up -d
```

## 📊 Monitoramento

### Logs do Sistema

#### Execução Local
- Backend: Logs aparecem no terminal onde `python src/main.py` foi executado
- Frontend: Logs aparecem no terminal onde `pnpm run dev` foi executado

#### Docker
```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Health Checks

- Backend: `http://localhost:5000/api/health`
- Frontend: `http://localhost:5173` (desenvolvimento) ou `http://localhost:80` (produção)

## 🔄 Atualizações

### Atualizar o Sistema
```bash
# Parar os serviços
docker-compose down

# Atualizar o código
git pull origin main

# Reconstruir e reiniciar
docker-compose build
docker-compose up -d
```

### Backup do Banco de Dados
```bash
# SQLite
cp backend/src/database/app.db backup_$(date +%Y%m%d_%H%M%S).db

# PostgreSQL
pg_dump gedo_cimcop > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 📞 Suporte

Se você encontrar problemas durante a instalação:

1. Verifique os logs de erro
2. Consulte a seção de solução de problemas
3. Verifique se todos os pré-requisitos estão instalados
4. Entre em contato com o suporte técnico

---

**Sucesso!** 🎉 Seu sistema GEDO CIMCOP está pronto para uso!

