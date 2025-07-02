# GEDO CIMCOP - Sistema de Gerenciamento de Documentos e Registros de Obras

Sistema moderno e performático para gerenciamento de documentos e registros operacionais de obras, desenvolvido com Flask (backend) e React (frontend).

## 🚀 Características Principais

- **Sistema de Usuários**: Administradores e Usuários Padrão com permissões específicas
- **Registros Unificados**: Formulário único para documentos e registros operacionais
- **Dashboard Inteligente**: Atividades recentes e estatísticas em tempo real
- **Pesquisa Avançada**: Filtros robustos para localização de registros
- **Interface Moderna**: Design responsivo com componentes shadcn/ui
- **Arquitetura Modular**: Código limpo e estrutura escalável
- **Deploy Simplificado**: Containerização com Docker

## 🛠️ Tecnologias Utilizadas

### Backend
- **Flask**: Framework web Python
- **SQLAlchemy**: ORM para banco de dados
- **JWT**: Autenticação segura
- **Flask-CORS**: Suporte a requisições cross-origin
- **SQLite**: Banco de dados (configurável para PostgreSQL)

### Frontend
- **React 19**: Biblioteca JavaScript moderna
- **Vite**: Build tool rápido
- **Tailwind CSS**: Framework CSS utilitário
- **shadcn/ui**: Componentes UI elegantes
- **React Router**: Roteamento SPA
- **Axios**: Cliente HTTP
- **date-fns**: Manipulação de datas

## 📋 Requisitos do Sistema

- **Python 3.11+**
- **Node.js 20+**
- **Docker** (opcional, para deploy containerizado)
- **4GB RAM** (mínimo)
- **10GB espaço em disco**

## 🚀 Instalação e Execução

### Opção 1: Execução Local (Desenvolvimento)

#### Backend
```bash
cd backend
source venv/bin/activate  # Linux/Mac
# ou venv\Scripts\activate  # Windows
pip install -r requirements.txt
python src/main.py
```

#### Frontend
```bash
cd frontend
pnpm install
pnpm run dev
```

### Opção 2: Docker (Produção)

```bash
# Executar todo o sistema
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f
```

## 🔐 Credenciais Padrão

- **Email**: admin@gedocimcop.com
- **Senha**: admin123

## 📁 Estrutura do Projeto

```
gedo_cimcop/
├── backend/                 # API Flask
│   ├── src/
│   │   ├── models/         # Modelos de dados
│   │   ├── routes/         # Rotas da API
│   │   └── main.py         # Ponto de entrada
│   ├── requirements.txt    # Dependências Python
│   └── Dockerfile         # Container backend
├── frontend/               # Aplicação React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── contexts/      # Contextos (Auth, etc.)
│   │   └── services/      # Serviços de API
│   ├── package.json       # Dependências Node.js
│   └── Dockerfile         # Container frontend
├── docker-compose.yml     # Orquestração
└── README.md             # Este arquivo
```

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend (.env)
```env
SECRET_KEY=sua-chave-secreta-aqui
DATABASE_URL=sqlite:///src/database/app.db
FLASK_ENV=development
```

#### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:5000/api
```

## 📊 Funcionalidades

### Para Administradores
- ✅ Gestão completa de usuários
- ✅ Cadastro e edição de obras
- ✅ Configuração de tipos de registro
- ✅ Acesso a todas as obras e registros
- ✅ Dashboard com estatísticas globais

### Para Usuários Padrão
- ✅ Acesso restrito à obra associada
- ✅ Criação e edição de registros
- ✅ Dashboard com atividades da obra
- ✅ Pesquisa avançada nos registros
- ✅ Upload de anexos

### Registros Unificados
- ✅ Título e descrição
- ✅ Tipo de registro configurável
- ✅ Data do registro
- ✅ Código/número de referência
- ✅ Upload de anexos
- ✅ Associação automática à obra

## 🔄 Workflow Automático

O sistema dispara workflows automáticos após a criação de registros:
- Notificação de responsáveis
- Encaminhamento por email
- Integração com sistemas externos (configurável)

## 🚀 Deploy em Produção

### Usando Docker
```bash
# Clone o repositório
git clone <url-do-repositorio>
cd gedo_cimcop

# Configure as variáveis de ambiente
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Execute o sistema
docker-compose up -d
```

### Deploy Manual
1. Configure um servidor web (Nginx/Apache)
2. Configure um banco PostgreSQL
3. Execute o backend com Gunicorn
4. Sirva o frontend buildado

## 🧪 Testes

```bash
# Backend
cd backend
python -m pytest

# Frontend
cd frontend
pnpm test
```

## 📝 API Documentation

A API está documentada automaticamente via Flask-RESTX em:
`http://localhost:5000/`

### Principais Endpoints

- `POST /api/auth/login` - Autenticação
- `GET /api/dashboard/atividades-recentes` - Atividades recentes
- `GET /api/registros` - Listar registros
- `POST /api/registros` - Criar registro
- `GET /api/pesquisa` - Pesquisa avançada

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

## 🆘 Suporte

Para suporte técnico:
- Email: suporte@gedocimcop.com
- Issues: GitHub Issues
- Documentação: Wiki do projeto

---

**GEDO CIMCOP** - Sistema de Gerenciamento de Documentos e Registros de Obras
Desenvolvido com ❤️ para otimizar a gestão de obras.

