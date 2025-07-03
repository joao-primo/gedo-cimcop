# 📋 MANUAL DO USUÁRIO - GEDO CIMCOP
## Sistema de Gestão de Documentos de Obras

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Empresa:** CIMCOP  

---

## 📖 ÍNDICE

1. [Introdução](#introdução)
2. [Primeiros Passos](#primeiros-passos)
3. [Funcionalidades por Perfil](#funcionalidades-por-perfil)
4. [Guia de Uso Detalhado](#guia-de-uso-detalhado)
5. [Boas Práticas](#boas-práticas)
6. [Solução de Problemas](#solução-de-problemas)
7. [Suporte](#suporte)

---

## 🎯 INTRODUÇÃO

### O que é o GEDO CIMCOP?

O **GEDO CIMCOP** é um sistema web desenvolvido para gerenciar documentos e registros de obras de construção civil. Ele permite:

- ✅ **Organizar documentos** por obra e tipo
- ✅ **Controlar acesso** de usuários
- ✅ **Pesquisar registros** rapidamente
- ✅ **Acompanhar atividades** em tempo real
- ✅ **Gerar relatórios** e estatísticas
- ✅ **Notificar responsáveis** automaticamente

### Quem pode usar?

- **👨‍💼 Administradores**: Controle total do sistema
- **👷‍♂️ Usuários de Obra**: Acesso limitado à sua obra específica

---

## 🚀 PRIMEIROS PASSOS

### 1. Acessando o Sistema

1. **Abra seu navegador** (Chrome, Firefox, Safari, Edge)
2. **Digite o endereço**: `https://gedo-cimcop.vercel.app`
3. **Aguarde carregar** a tela de login

### 2. Fazendo Login

**Para Administradores (primeiro acesso):**
- **Email**: `admin@gedo.com`
- **Senha**: `admin123`

**⚠️ IMPORTANTE**: Troque a senha imediatamente após o primeiro login!

### 3. Alterando Senha (Obrigatório)

1. Após o primeiro login, você será **redirecionado automaticamente**
2. **Digite sua senha atual**
3. **Crie uma nova senha** (mínimo 8 caracteres)
4. **Confirme a nova senha**
5. Clique em **"Alterar Senha"**

**Regras para senha segura:**
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula  
- Pelo menos 1 número
- Evite dados pessoais (nome, data de nascimento)

---

## 👥 FUNCIONALIDADES POR PERFIL

### 🔑 ADMINISTRADOR

**Pode fazer tudo:**
- ✅ Gerenciar todas as obras
- ✅ Criar e editar usuários
- ✅ Ver registros de todas as obras
- ✅ Configurar o sistema
- ✅ Configurar workflows de notificação
- ✅ Acessar relatórios completos

### 👤 USUÁRIO PADRÃO

**Acesso limitado à sua obra:**
- ✅ Criar registros na sua obra
- ✅ Ver registros da sua obra
- ✅ Pesquisar documentos da sua obra
- ✅ Alterar sua própria senha
- ❌ Não pode gerenciar usuários
- ❌ Não pode ver outras obras

---

## 📚 GUIA DE USO DETALHADO

### 🏠 DASHBOARD (Tela Inicial)

**O que você vê:**
- **Estatísticas gerais**: Total de registros, atividade recente
- **Gráficos**: Distribuição por tipo, atividade dos últimos 30 dias
- **Atividades recentes**: Últimos registros criados
- **Informações da sua obra** (usuários padrão)

**Como usar:**
- Use o botão **"Atualizar"** para ver dados mais recentes
- **Clique nos gráficos** para ver detalhes
- **Clique nas atividades** para ver mais informações

---

### 📄 CRIANDO REGISTROS

#### Passo a Passo:

1. **Clique em "Registros"** no menu lateral
2. **Preencha os campos obrigatórios:**
   - **Obra** (apenas administradores escolhem)
   - **Título**: Nome do documento/registro
   - **Tipo de Registro**: Selecione da lista
   - **Data do Registro**: Quando foi criado/recebido
   - **Código/Número**: Identificação única (ex: DOC-001)
   - **Descrição**: Detalhes do conteúdo

3. **Anexar arquivo (opcional):**
   - Clique em **"Escolher arquivo"**
   - Selecione o documento do seu computador
   - **Tipos aceitos**: PDF, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG, JPEG, GIF
   - **Tamanho máximo**: 16MB

4. **Clique em "Salvar Registro"**

#### ✅ Dicas Importantes:
- **Use códigos únicos** para facilitar a busca
- **Seja descritivo** no título e descrição
- **Anexe sempre que possível** o documento original
- **Verifique os dados** antes de salvar

---

### 🔍 PESQUISANDO REGISTROS

#### Como Pesquisar:

1. **Clique em "Pesquisa"** no menu lateral
2. **Use os filtros disponíveis:**
   - **Data do Registro**: Filtre por período
   - **Obra**: Selecione uma obra específica (admin)
   - **Tipo de Registro**: Filtre por categoria
   - **Palavra-chave**: Busque no título e descrição

3. **Clique em "Pesquisar"**
4. **Para baixar anexos**: Clique no botão "Baixar"

#### 💡 Dicas de Pesquisa:
- **Combine filtros** para resultados mais precisos
- **Use palavras-chave simples** (ex: "fundação", "estrutura")
- **Pesquise por código** para encontrar rapidamente
- **Use datas** para localizar registros de períodos específicos

---

### 🏗️ GERENCIANDO OBRAS (Apenas Administradores)

#### Criando Nova Obra:

1. **Clique em "Obras"** no menu lateral
2. **Clique em "Nova Obra"**
3. **Preencha os dados:**
   - **Nome**: Nome da obra
   - **Código**: Identificação única (ex: OBR-001)
   - **Cliente**: Nome do contratante
   - **Localização**: Cidade/Estado
   - **Datas**: Início e término previsto
   - **Responsáveis**: Técnico e administrativo
   - **Status**: Em andamento, Finalizada, Suspensa
   - **Descrição**: Detalhes da obra

4. **Clique em "Salvar"**

#### ⚠️ Status das Obras:
- **Em andamento**: Permite criar registros
- **Finalizada**: Apenas consulta
- **Suspensa**: Bloqueia criação de registros

---

### 👥 GERENCIANDO USUÁRIOS (Apenas Administradores)

#### Criando Novo Usuário:

1. **Clique em "Usuários"** no menu lateral
2. **Clique em "Novo Usuário"**
3. **Preencha os dados:**
   - **Nome de usuário**: Login do usuário
   - **Email**: Email válido
   - **Senha**: Senha temporária (usuário deve trocar)
   - **Tipo**: Administrador ou Usuário Padrão
   - **Obra**: Selecione para usuários padrão
   - **Status**: Ativo/Inativo

4. **Clique em "Criar"**

#### 🔐 Alterando Senha de Usuário:

1. **Na lista de usuários**, clique no ícone de **chave** 🔑
2. **Digite a nova senha temporária**
3. **Confirme a senha**
4. **Clique em "Alterar Senha"**

**⚠️ IMPORTANTE**: O usuário será obrigado a trocar a senha no próximo login.

---

### ⚙️ CONFIGURAÇÕES

#### Para Usuários Padrão:
- **Alterar senha pessoal**
- **Ver informações do sistema**

#### Para Administradores:
- **Configurações gerais**: Nome, versão, empresa
- **Configurações de sistema**: Uploads, backups, logs
- **Notificações**: Email, SMTP
- **Segurança**: Timeouts, tentativas de login

---

### 🔄 WORKFLOWS (Apenas Administradores)

**O que são workflows?**
Notificações automáticas por email quando registros são criados, editados ou excluídos.

#### Configurando Workflow:

1. **Clique em "Workflow"** no menu lateral
2. **Clique em "Novo Workflow"**
3. **Configure:**
   - **Obra**: Selecione a obra
   - **Nome**: Nome do workflow
   - **Emails**: Responsáveis que receberão notificações
   - **Quando notificar**: Criação, edição, exclusão
   - **Filtros**: Tipos específicos (opcional)

4. **Clique em "Salvar"**

---

## ✅ BOAS PRÁTICAS

### 📋 Para Registros:

1. **Use códigos padronizados:**
   - Exemplo: `DOC-2024-001`, `REG-FUND-001`
   - Mantenha sequência numérica

2. **Títulos descritivos:**
   - ❌ Ruim: "Documento"
   - ✅ Bom: "Projeto Estrutural - Fundação Bloco A"

3. **Descrições completas:**
   - Inclua: O que é, de onde veio, para que serve
   - Mencione revisões e alterações

4. **Organize por tipos:**
   - Crie tipos específicos para sua obra
   - Use categorias consistentes

### 🔐 Para Segurança:

1. **Senhas fortes:**
   - Mínimo 8 caracteres
   - Misture letras, números e símbolos
   - Não compartilhe senhas

2. **Logout sempre:**
   - Especialmente em computadores compartilhados
   - Use o botão "Sair" no menu

3. **Acesso responsável:**
   - Não deixe sessão aberta sem supervisão
   - Reporte problemas imediatamente

### 📁 Para Arquivos:

1. **Nomes de arquivo claros:**
   - ❌ Ruim: `doc1.pdf`
   - ✅ Bom: `projeto_estrutural_bloco_a_rev02.pdf`

2. **Formatos adequados:**
   - **Documentos**: PDF (preferível), DOC, DOCX
   - **Planilhas**: XLS, XLSX
   - **Imagens**: PNG, JPG (boa qualidade)

3. **Tamanho otimizado:**
   - Máximo 16MB por arquivo
   - Comprima imagens se necessário
   - Use PDF para documentos finais

---

## 🆘 SOLUÇÃO DE PROBLEMAS

### 🔐 Problemas de Login

**"Email ou senha incorretos"**
- ✅ Verifique se digitou corretamente
- ✅ Certifique-se que Caps Lock está desligado
- ✅ Tente recuperar senha se necessário

**"Usuário bloqueado"**
- ✅ Aguarde 15 minutos
- ✅ Entre em contato com administrador

### 📄 Problemas com Registros

**"Erro ao salvar registro"**
- ✅ Verifique se todos os campos obrigatórios estão preenchidos
- ✅ Verifique se o arquivo não excede 16MB
- ✅ Tente novamente em alguns minutos

**"Arquivo muito grande"**
- ✅ Comprima o arquivo
- ✅ Divida em partes menores
- ✅ Use formato mais eficiente (PDF em vez de imagem)

### 🔍 Problemas de Pesquisa

**"Nenhum resultado encontrado"**
- ✅ Verifique os filtros aplicados
- ✅ Tente palavras-chave mais simples
- ✅ Remova filtros desnecessários

### 🌐 Problemas de Conexão

**"Erro de conexão"**
- ✅ Verifique sua internet
- ✅ Atualize a página (F5)
- ✅ Tente em outro navegador

**"Página não carrega"**
- ✅ Limpe cache do navegador
- ✅ Desabilite extensões temporariamente
- ✅ Tente em modo anônimo/privado

---

## 📞 SUPORTE

### 🆘 Quando Solicitar Suporte:

- **Erros persistentes** que não consegue resolver
- **Perda de dados** ou arquivos
- **Problemas de acesso** que impedem o trabalho
- **Dúvidas sobre funcionalidades** específicas
- **Sugestões de melhorias**

### 📧 Como Solicitar Suporte:

**Inclua sempre:**
1. **Seu nome e empresa**
2. **Descrição detalhada do problema**
3. **Passos que levaram ao erro**
4. **Mensagens de erro** (se houver)
5. **Navegador utilizado** (Chrome, Firefox, etc.)
6. **Prints da tela** (se possível)

**Exemplo de solicitação:**
\`\`\`
Assunto: Erro ao fazer upload de arquivo

Olá,

Sou João Silva da obra OBR-001.

Estou tentando fazer upload de um arquivo PDF de 5MB, 
mas recebo a mensagem "Erro interno do servidor".

Passos:
1. Entrei em Registros > Novo Registro
2. Preenchi todos os campos
3. Selecionei o arquivo "projeto_fundacao.pdf"
4. Cliquei em "Salvar Registro"
5. Apareceu o erro

Navegador: Chrome versão 120
Anexo: print da tela com o erro

Aguardo retorno.

João Silva
\`\`\`

### ⏰ Tempo de Resposta:

- **Problemas críticos**: 4 horas úteis
- **Problemas normais**: 24 horas úteis
- **Dúvidas e melhorias**: 48 horas úteis

---

## 📱 COMPATIBILIDADE

### 💻 Navegadores Suportados:
- ✅ **Chrome** 90+ (Recomendado)
- ✅ **Firefox** 88+
- ✅ **Safari** 14+
- ✅ **Edge** 90+

### 📱 Dispositivos:
- ✅ **Desktop/Notebook** (Recomendado)
- ✅ **Tablet** (Funcional)
- ✅ **Smartphone** (Básico)

### 🌐 Conexão:
- **Mínima**: 1 Mbps
- **Recomendada**: 5 Mbps ou superior

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Para Administradores:

**Antes de liberar para a equipe:**

- [ ] Alterar senha padrão do admin
- [ ] Criar obras no sistema
- [ ] Criar tipos de registro necessários
- [ ] Criar usuários da equipe
- [ ] Configurar workflows de notificação
- [ ] Testar todas as funcionalidades
- [ ] Treinar usuários principais
- [ ] Definir procedimentos internos

**Procedimentos recomendados:**

- [ ] Backup semanal dos dados
- [ ] Revisão mensal de usuários ativos
- [ ] Limpeza trimestral de arquivos antigos
- [ ] Auditoria semestral de acessos

---

## 📈 VERSÃO E ATUALIZAÇÕES

**Versão atual:** 1.0  
**Data de lançamento:** Janeiro 2025

### Próximas funcionalidades planejadas:
- 📊 Relatórios avançados
- 📱 App mobile nativo
- 🔄 Integração com outros sistemas
- 📋 Aprovação de documentos
- 📈 Dashboard executivo

---

## 📄 TERMOS DE USO

- Este sistema é de uso **exclusivo interno**
- **Não compartilhe** credenciais de acesso
- **Mantenha confidencialidade** dos dados
- **Use apenas para fins profissionais**
- **Reporte problemas** de segurança imediatamente

---

**© 2025 CIMCOP - Todos os direitos reservados**

*Este manual foi criado para facilitar o uso do sistema GEDO CIMCOP. Para dúvidas ou sugestões, entre em contato com o suporte técnico.*
