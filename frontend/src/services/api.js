import axios from "axios"

// Configuração base do axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000, // ← AUMENTADO: 30 segundos para downloads grandes
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log("Fazendo requisição:", config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error("Erro na requisição:", error)
    return Promise.reject(error)
  },
)

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    console.log("Resposta recebida:", response.status, response.config.url)
    return response
  },
  (error) => {
    console.error("Erro na resposta:", error.response?.status, error.config?.url, error.response?.data)

    // Se token expirou, redirecionar para login
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    return Promise.reject(error)
  },
)

// APIs de Autenticação
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
  forgotPassword: (email) => api.post("/forgot-password", { email }),
  resetPassword: (token, newPassword) => api.post("/reset-password", { token, new_password: newPassword }),
  changePassword: (data) => api.post("/auth/change-password", data),
  getPasswordStatus: () => api.get("/auth/password-status"),
}

// APIs do Dashboard
export const dashboardAPI = {
  getEstatisticas: () => api.get("/dashboard/estatisticas"),
  getAtividadesRecentes: (limit = 10) => api.get(`/dashboard/atividades-recentes?limit=${limit}`),
  getTimeline: (dias = 30) => api.get(`/dashboard/timeline?dias=${dias}`),
}

// APIs de Pesquisa
export const pesquisaAPI = {
  getFiltros: () => api.get("/pesquisa/filtros"),
  pesquisar: (params) => api.get("/pesquisa/", { params }),
  exportarExcel: (params) =>
    api.get("/pesquisa/exportar", {
      params,
      responseType: "blob",
      timeout: 60000,
    }),
  visualizar: (id) => api.get(`/pesquisa/visualizar/${id}`),
}

// APIs de Registros
export const registrosAPI = {
  listar: (params) => api.get("/registros/", { params }),
  criar: (data) => {
    return api.post("/registros/", data, {
      headers: {
        "Content-Type": undefined, // Deixar o browser definir automaticamente
      },
    })
  },
  obter: (id) => api.get(`/registros/${id}`),
  atualizar: (id, data) => api.put(`/registros/${id}`, data),
  deletar: (id) => api.delete(`/registros/${id}`),
  // ← CORREÇÃO CRÍTICA: Melhor tratamento do filename no download
  downloadAnexo: async (id) => {
    try {
      console.log("🔽 Baixando arquivo via backend proxy:", `/api/registros/${id}/download`)

      const response = await api.get(`/registros/${id}/download`, {
        responseType: "blob", // Importante para arquivos
        timeout: 60000, // 60 segundos para downloads grandes
      })

      // ← CORREÇÃO CRÍTICA: Melhor extração do filename
      const contentDisposition = response.headers["content-disposition"]
      let filename = `anexo_${id}`

      if (contentDisposition) {
        // Tentar extrair filename do header Content-Disposition
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, "") // Remover aspas
        }
      }

      // ← CORREÇÃO: Se ainda não tem extensão, tentar detectar pelo Content-Type
      if (!filename.includes(".")) {
        const contentType = response.headers["content-type"]
        const extensionMap = {
          "application/pdf": ".pdf",
          "application/msword": ".doc",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
          "application/vnd.ms-excel": ".xls",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
          "image/png": ".png",
          "image/jpeg": ".jpg",
          "image/gif": ".gif",
          "text/plain": ".txt",
        }

        if (contentType && extensionMap[contentType]) {
          filename += extensionMap[contentType]
        }
      }

      console.log("📎 Filename detectado:", filename)
      console.log("📎 Content-Type:", response.headers["content-type"])

      // Criar URL do blob e fazer download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      console.log("✅ Download concluído:", filename)
      return { success: true, filename }
    } catch (error) {
      console.error("❌ Erro ao baixar arquivo:", error)

      // Mensagens de erro mais específicas
      if (error.response?.status === 404) {
        throw new Error("Arquivo não encontrado")
      } else if (error.response?.status === 403) {
        throw new Error("Acesso negado ao arquivo")
      } else if (error.code === "ECONNABORTED") {
        throw new Error("Timeout no download - arquivo muito grande")
      } else {
        throw new Error("Erro ao baixar arquivo")
      }
    }
  },
  importarLote: (formData) =>
    api.post("/importacao/lote", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
}

// APIs de Obras
export const obrasAPI = {
  listar: () => api.get("/obras/"),
  criar: (data) => api.post("/obras/", data),
  obter: (id) => api.get(`/obras/${id}`),
  atualizar: (id, data) => api.put(`/obras/${id}`, data),
  deletar: (id) => api.delete(`/obras/${id}`),
}

// APIs de Usuários
export const usuariosAPI = {
  listar: () => api.get("/users/"),
  criar: (data) => api.post("/users/", data),
  obter: (id) => api.get(`/users/${id}`),
  atualizar: (id, data) => api.put(`/users/${id}`, data),
  deletar: (id) => api.delete(`/users/${id}`),
}

// APIs de Tipos de Registro
export const tiposRegistroAPI = {
  listar: () => api.get("/tipos-registro/"),
  listarTodos: () => api.get("/tipos-registro/all"),
  criar: (data) => api.post("/tipos-registro/", data),
  obter: (id) => api.get(`/tipos-registro/${id}`),
  atualizar: (id, data) => api.put(`/tipos-registro/${id}`, data),
  deletar: (id) => api.delete(`/tipos-registro/${id}`),
}

// APIs de Configurações
export const configuracoesAPI = {
  get: () => api.get("/configuracoes/"),
  save: (data) => api.post("/configuracoes/", data),
  backup: () => api.post("/configuracoes/backup"),
  reset: () => api.post("/configuracoes/reset"),
}

// APIs de Workflow
export const workflowAPI = {
  listar: () => api.get("/workflow/"),
  criar: (data) => api.post("/workflow/", data),
  atualizar: (id, data) => api.put(`/workflow/${id}`, data),
  deletar: (id) => api.delete(`/workflow/${id}`),
}

// ✨ NOVAS APIs de Importação em Lote
export const importacaoAPI = {
  downloadTemplate: () =>
    api.get("/importacao/template", {
      responseType: "blob",
      timeout: 60000,
    }),
  processarPlanilha: (formData) =>
    api.post("/importacao/processar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    }),
  uploadAnexo: (formData) =>
    api.post("/importacao/upload-anexo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    }),
  finalizarImportacao: (data) =>
    api.post("/importacao/finalizar", data, {
      timeout: 120000, // 2 minutos para importações grandes
    }),
}

// ✨ NOVAS APIs de Relatórios
export const relatoriosAPI = {
  // Placeholder para futuras funcionalidades
  listar: () => api.get("/relatorios/"),
  gerar: (tipo, params) =>
    api.post(`/relatorios/${tipo}`, params, {
      responseType: "blob",
      timeout: 120000,
    }),
}

// Export da instância principal para casos especiais
export default api
