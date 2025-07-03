# 📋 PROCEDIMENTOS PARA IMPLEMENTAÇÃO EM EMPRESAS
## GEDO CIMCOP - Sistema de Gestão de Documentos

---

## 🎯 OBJETIVO

Este documento estabelece os **procedimentos padrão** para implementação e uso do sistema GEDO CIMCOP em empresas de construção civil, garantindo:

- ✅ **Padronização** de processos
- ✅ **Segurança** de dados
- ✅ **Eficiência** operacional
- ✅ **Conformidade** com normas internas

---

## 👥 RESPONSABILIDADES

### 🔑 ADMINISTRADOR DO SISTEMA
**Responsável:** TI ou Gerente de Projetos

**Atribuições:**
- Configurar e manter o sistema
- Gerenciar usuários e permissões
- Realizar backups e atualizações
- Monitorar segurança e performance
- Treinar novos usuários
- Definir padrões e procedimentos

### 👤 USUÁRIOS FINAIS
**Responsável:** Equipe de obra/projeto

**Atribuições:**
- Criar registros de documentos
- Manter dados atualizados
- Seguir procedimentos estabelecidos
- Reportar problemas técnicos
- Participar de treinamentos

---

## 🚀 FASE 1: PLANEJAMENTO (1-2 semanas)

### 📋 1.1 Levantamento de Requisitos

**Checklist de informações necessárias:**

- [ ] **Obras ativas**: Lista com códigos, nomes, responsáveis
- [ ] **Tipos de documentos**: Categorias utilizadas na empresa
- [ ] **Usuários**: Lista de pessoas que usarão o sistema
- [ ] **Fluxos atuais**: Como documentos são gerenciados hoje
- [ ] **Integrações**: Outros sistemas que precisam se conectar

**Documento de requisitos (template):**
\`\`\`
EMPRESA: _______________
DATA: _______________

OBRAS:
- Código: OBR-001 | Nome: Edifício Central | Responsável: João Silva
- Código: OBR-002 | Nome: Residencial Norte | Responsável: Maria Santos

TIPOS DE DOCUMENTO:
- Projetos (Arquitetônico, Estrutural, Hidráulico, Elétrico)
- Licenças (Ambiental, Prefeitura, Bombeiros)
- Contratos (Fornecedores, Subempreiteiros)
- Relatórios (Diário, Semanal, Mensal)
- Certificados (Materiais, Ensaios, Qualidade)

USUÁRIOS:
- Administradores: [Nome] [Email] [Função]
- Usuários por obra: [Nome] [Email] [Obra]

INTEGRAÇÕES NECESSÁRIAS:
- Sistema ERP: Sim/Não
- Email corporativo: Sim/Não
- Backup em nuvem: Sim/Não
\`\`\`

### 📊 1.2 Definição de Padrões

**Padrão de nomenclatura de códigos:**
\`\`\`
OBRAS: OBR-[ANO]-[SEQUENCIAL]
Exemplo: OBR-2024-001, OBR-2024-002

DOCUMENTOS: [TIPO]-[OBRA]-[SEQUENCIAL]
Exemplo: PROJ-001-001, LIC-001-001, CONT-001-001
\`\`\`

**Padrão de tipos de registro:**
- **PROJ** - Projetos
- **LIC** - Licenças e Alvarás  
- **CONT** - Contratos
- **REL** - Relatórios
- **CERT** - Certificados
- **FOTO** - Registros Fotográficos
- **ATA** - Atas de Reunião
- **PLAN** - Planilhas

---

## 🔧 FASE 2: CONFIGURAÇÃO (1 semana)

### ⚙️ 2.1 Configuração Inicial do Sistema

**Passo a passo para o administrador:**

1. **Acesso inicial:**
   - URL: `https://gedo-cimcop.vercel.app`
   - Login: `admin@gedo.com`
   - Senha: `admin123`

2. **Alterar dados do administrador:**
   - Ir em Configurações > Alterar Senha
   - Criar senha forte (mínimo 8 caracteres)
   - Anotar em local seguro

3. **Configurar informações da empresa:**
   - Ir em Configurações > Geral
   - Nome da empresa
   - Contato de suporte
   - Informações básicas

### 🏗️ 2.2 Cadastro de Obras

**Para cada obra, cadastrar:**

\`\`\`
Nome: [Nome completo da obra]
Código: [Seguir padrão OBR-YYYY-XXX]
Cliente: [Nome do contratante]
Localização: [Cidade/Estado]
Data de Início: [DD/MM/AAAA]
Data de Término: [DD/MM/AAAA] (previsão)
Responsável Técnico: [Nome do engenheiro]
Responsável Administrativo: [Nome do gerente]
Status: Em andamento
Descrição: [Detalhes da obra]
\`\`\`

### 📝 2.3 Cadastro de Tipos de Registro

**Criar tipos conforme padrão definido:**

1. Ir em Configurações > Tipos de Registro
2. Para cada tipo, cadastrar:
   - Nome: [Nome do tipo]
   - Descrição: [Para que serve]
   - Ativo: Sim

**Exemplo:**
\`\`\`
Nome: Projeto Arquitetônico
Descrição: Plantas, cortes, fachadas e detalhes arquitetônicos
Ativo: Sim

Nome: Licença Ambiental  
Descrição: Licenças e autorizações ambientais
Ativo: Sim
\`\`\`

### 👥 2.4 Cadastro de Usuários

**Para cada usuário:**

1. Ir em Usuários > Novo Usuário
2. Preencher dados:
   \`\`\`
   Nome de usuário: [login_usuario]
   Email: [email@empresa.com]
   Senha: [senha_temporaria_123]
   Tipo: Usuário Padrão (ou Administrador)
   Obra: [Selecionar obra específica]
   Status: Ativo
   \`\`\`

3. **Anotar credenciais** para envio posterior

---

## 📚 FASE 3: TREINAMENTO (1 semana)

### 🎓 3.1 Treinamento de Administradores

**Duração:** 4 horas  
**Participantes:** Administradores do sistema

**Conteúdo:**
- Visão geral do sistema
- Gerenciamento de usuários
- Configurações avançadas
- Workflows e notificações
- Backup e segurança
- Solução de problemas

**Material necessário:**
- [ ] Manual do usuário impresso
- [ ] Computador com acesso ao sistema
- [ ] Lista de exercícios práticos

### 👨‍💼 3.2 Treinamento de Usuários Finais

**Duração:** 2 horas por turma  
**Participantes:** Usuários de cada obra

**Conteúdo:**
- Como fazer login
- Criar registros de documentos
- Pesquisar e baixar arquivos
- Alterar senha
- Boas práticas

**Exercício prático:**
1. Fazer login no sistema
2. Criar 3 registros diferentes
3. Anexar arquivos
4. Pesquisar registros criados
5. Alterar senha pessoal

---

## 🔄 FASE 4: IMPLEMENTAÇÃO (2 semanas)

### 📅 4.1 Cronograma de Implementação

**Semana 1:**
- Segunda: Migração de documentos críticos
- Terça: Teste com usuários piloto
- Quarta: Ajustes e correções
- Quinta: Treinamento da primeira turma
- Sexta: Liberação para primeira obra

**Semana 2:**
- Segunda: Treinamento da segunda turma
- Terça: Liberação para segunda obra
- Quarta: Monitoramento e suporte
- Quinta: Treinamento da terceira turma
- Sexta: Liberação geral

### 📋 4.2 Migração de Documentos

**Procedimento para migração:**

1. **Priorizar documentos:**
   - Críticos: Licenças, contratos vigentes
   - Importantes: Projetos atuais
   - Históricos: Documentos antigos

2. **Preparar arquivos:**
   - Renomear seguindo padrão
   - Organizar por obra e tipo
   - Verificar qualidade e legibilidade

3. **Cadastrar no sistema:**
   - Criar registro com dados completos
   - Anexar arquivo digital
   - Verificar se salvou corretamente

### ✅ 4.3 Checklist de Go-Live

**Antes de liberar para produção:**

- [ ] Todas as obras cadastradas
- [ ] Todos os tipos de registro criados
- [ ] Todos os usuários cadastrados e testados
- [ ] Documentos críticos migrados
- [ ] Workflows configurados
- [ ] Backup configurado
- [ ] Equipe de suporte definida
- [ ] Procedimentos documentados

---

## 📊 PROCEDIMENTOS OPERACIONAIS

### 📄 5.1 Criação de Registros

**Procedimento padrão:**

1. **Recebimento do documento:**
   - Verificar se é original ou cópia
   - Anotar data de recebimento
   - Identificar obra e tipo

2. **Digitalização (se necessário):**
   - Escanear em alta qualidade (300 DPI)
   - Salvar em PDF
   - Nomear arquivo seguindo padrão

3. **Cadastro no sistema:**
   - Acessar GEDO CIMCOP
   - Ir em Registros > Novo Registro
   - Preencher todos os campos obrigatórios
   - Anexar arquivo digital
   - Salvar registro

4. **Verificação:**
   - Confirmar que salvou corretamente
   - Testar download do arquivo
   - Anotar código gerado

**Template de preenchimento:**
\`\`\`
Título: [Nome claro e descritivo]
Tipo: [Selecionar da lista]
Data: [Data do documento, não de hoje]
Código: [Seguir padrão da empresa]
Descrição: [Detalhes importantes: revisão, validade, observações]
\`\`\`

### 🔍 5.2 Pesquisa de Documentos

**Procedimento para localizar documentos:**

1. **Pesquisa simples:**
   - Usar palavra-chave no título
   - Filtrar por tipo de documento
   - Filtrar por data

2. **Pesquisa avançada:**
   - Combinar múltiplos filtros
   - Usar código do documento
   - Pesquisar na descrição

3. **Download de arquivos:**
   - Clicar em "Baixar" na lista
   - Verificar se arquivo abriu corretamente
   - Salvar em local apropriado

### 📈 5.3 Relatórios e Controles

**Relatórios mensais obrigatórios:**

1. **Relatório de atividade:**
   - Quantos registros foram criados
   - Por obra e por tipo
   - Usuários mais ativos

2. **Relatório de pendências:**
   - Documentos vencidos
   - Licenças próximas do vencimento
   - Contratos a renovar

**Como gerar:**
- Usar Dashboard para estatísticas
- Usar Pesquisa para filtros específicos
- Exportar listas quando necessário

---

## 🔐 PROCEDIMENTOS DE SEGURANÇA

### 🛡️ 6.1 Controle de Acesso

**Política de senhas:**
- Mínimo 8 caracteres
- Misturar letras, números e símbolos
- Trocar a cada 90 dias
- Não compartilhar com terceiros
- Não usar dados pessoais

**Controle de usuários:**
- Revisar lista mensalmente
- Desativar usuários que saíram da empresa
- Criar usuários apenas quando necessário
- Documentar todas as alterações

### 💾 6.2 Backup e Recuperação

**Procedimento de backup:**
- Backup automático diário (configurado no sistema)
- Backup manual semanal (download de dados)
- Teste de recuperação mensal
- Armazenamento em local seguro

**Em caso de perda de dados:**
1. Não entrar em pânico
2. Documentar o que aconteceu
3. Contatar suporte imediatamente
4. Não tentar "consertar" sozinho
5. Aguardar orientações técnicas

### 🚨 6.3 Incidentes de Segurança

**Situações que devem ser reportadas imediatamente:**
- Acesso não autorizado
- Vazamento de documentos
- Suspeita de invasão
- Perda de dados
- Comportamento anômalo do sistema

**Como reportar:**
1. Anotar data, hora e detalhes
2. Fazer prints de tela se possível
3. Contatar administrador do sistema
4. Não compartilhar informações com terceiros
5. Aguardar orientações

---

## 📞 SUPORTE E MANUTENÇÃO

### 🆘 7.1 Níveis de Suporte

**Nível 1 - Usuário Final:**
- Problemas simples de login
- Dúvidas sobre funcionalidades
- Erros de preenchimento

**Nível 2 - Administrador Local:**
- Criação/edição de usuários
- Configurações do sistema
- Problemas técnicos intermediários

**Nível 3 - Suporte Técnico:**
- Problemas de infraestrutura
- Bugs do sistema
- Integrações complexas

### 🔧 7.2 Manutenção Preventiva

**Atividades semanais:**
- [ ] Verificar funcionamento geral
- [ ] Revisar logs de erro
- [ ] Testar backup
- [ ] Monitorar espaço em disco

**Atividades mensais:**
- [ ] Revisar usuários ativos
- [ ] Limpar arquivos temporários
- [ ] Atualizar documentação
- [ ] Treinar novos usuários

**Atividades trimestrais:**
- [ ] Auditoria de segurança
- [ ] Revisão de procedimentos
- [ ] Avaliação de performance
- [ ] Planejamento de melhorias

### 📊 7.3 Indicadores de Performance

**KPIs a acompanhar:**

1. **Adoção do sistema:**
   - % de usuários ativos
   - Número de registros por mês
   - Tempo médio de resposta

2. **Qualidade dos dados:**
   - % de registros com anexos
   - % de campos preenchidos
   - Número de registros duplicados

3. **Satisfação dos usuários:**
   - Pesquisa de satisfação trimestral
   - Número de chamados de suporte
   - Tempo de resolução de problemas

---

## 📋 TEMPLATES E FORMULÁRIOS

### 📝 Template de Solicitação de Acesso

\`\`\`
SOLICITAÇÃO DE ACESSO - GEDO CIMCOP

Data: ___/___/______
Solicitante: _________________________
Cargo: _____________________________

DADOS DO USUÁRIO:
Nome completo: ______________________
Email corporativo: __________________
Telefone: ___________________________
Obra/Setor: _________________________

TIPO DE ACESSO:
[ ] Usuário Padrão (acesso limitado à obra)
[ ] Administrador (acesso total)

JUSTIFICATIVA:
_____________________________________
_____________________________________

APROVAÇÃO:
Gestor imediato: ____________________
Data: ___/___/______
Assinatura: _________________________

PARA USO DO ADMINISTRADOR:
Usuário criado em: ___/___/______
Login: ______________________________
Senha temporária: ___________________
Treinamento realizado: ___/___/______
\`\`\`

### 📋 Checklist de Desligamento

\`\`\`
CHECKLIST - DESLIGAMENTO DE USUÁRIO

Funcionário: _________________________
Data de desligamento: ___/___/______

AÇÕES REALIZADAS:
[ ] Usuário desativado no sistema
[ ] Acesso testado (deve estar bloqueado)
[ ] Documentos pessoais transferidos
[ ] Senhas alteradas (se necessário)
[ ] Equipamentos devolvidos
[ ] Backup de dados realizado

Responsável: _________________________
Data: ___/___/______
Assinatura: _________________________
\`\`\`

---

## 📚 GLOSSÁRIO

**Administrador:** Usuário com acesso total ao sistema  
**Anexo:** Arquivo digital vinculado a um registro  
**Backup:** Cópia de segurança dos dados  
**Dashboard:** Tela inicial com resumo e estatísticas  
**Deploy:** Processo de colocar o sistema em produção  
**Filtro:** Ferramenta para refinar pesquisas  
**Login:** Processo de entrada no sistema  
**Registro:** Entrada de documento no sistema  
**Upload:** Envio de arquivo para o sistema  
**Usuário Padrão:** Usuário com acesso limitado à sua obra  
**Workflow:** Fluxo automatizado de notificações  

---

## 📄 CONTROLE DE VERSÕES

| Versão | Data | Alterações | Responsável |
|--------|------|------------|-------------|
| 1.0 | Jan/2025 | Versão inicial | Equipe GEDO |

---

**© 2025 CIMCOP - Documento de uso interno**

*Este documento deve ser revisado semestralmente e atualizado conforme necessário.*
