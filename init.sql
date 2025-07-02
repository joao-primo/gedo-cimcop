-- Script de inicialização do banco PostgreSQL
CREATE DATABASE gedo_cimcop;
CREATE USER gedo_user WITH ENCRYPTED PASSWORD 'gedo_password';
GRANT ALL PRIVILEGES ON DATABASE gedo_cimcop TO gedo_user;

-- Conectar ao banco criado
\c gedo_cimcop;

-- Dar permissões ao usuário
GRANT ALL ON SCHEMA public TO gedo_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gedo_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gedo_user;
