import axios from "axios"

// Configuração base do axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000, // ← AUMENTADO: 30 segundos para downloads grandes
  headers: {
    "Content-Type": "application/json",
  },
})

// Função para buscar o token CSRF
let csrfToken = null;
export async function fetchCsrfToken() {
  try {
    const res = await api.get('/csrf-token');
    csrfToken = res.data.csrf_token;
    return csrfToken;
  } catch (err) {
    console.error('Erro ao buscar CSRF token:', err);
    return null;
  }
}

// Interceptor para adicionar token CSRF automaticamente
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Adicionar CSRF apenas em métodos mutáveis
    const mutating = ["post", "put", "patch", "delete"];
    if (mutating.includes(config.method)) {
      if (!csrfToken) {
        await fetchCsrfToken();
      }
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }
    // Só defina Content-Type se não for FormData
    if (
      config.data &&
      typeof config.data === "object" &&
      config.data.constructor &&
      config.data.constructor.name === "FormData"
    ) {
      // Não defina Content-Type, deixe o browser/axios fazer
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] = "application/json";
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

    // Se token expirou, redirecionar para login, exceto se for a própria rota de login
    if (
      error.response?.status === 401 &&
      error.config?.url &&
      !error.config.url.includes("/auth/login")
    ) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    return Promise.reject(error)
  }
)

// APIs de Autenticação
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
  forgotPassword: (email) => api.post("/forgot-password", { email }),
  resetPassword: (token, newPassword) => api.post("/reset-password", { token, password: newPassword }),
  changePassword: (data) => api.post("/auth/change-password", data),
  getPasswordStatus: () => api.get("/auth/password-status"),
}

// APIs do Dashboard
export const dashboardAPI = {
  getEstatisticas: (params = {}) => api.get("/dashboard/estatisticas", { params }),
  getAtividadesRecentes: (limit = 10, obra_id = null) => api.get(`/dashboard/atividades-recentes?limit=${limit}${obra_id && obra_id !== "todas" ? `&obra_id=${obra_id}` : ""}`),
  getTimeline: (dias = 30, obra_id = null) => {
    let url = `/dashboard/timeline/${dias}`;
    if (obra_id && obra_id !== "todas") {
      url += `?obra_id=${obra_id}`;
    }
    return api.get(url);
  },
}

// APIs de Pesquisa
export const pesquisaAPI = {
  getFiltros: () => api.get("/pesquisa/filtros"),
  pesquisar: (params) => api.get("/pesquisa/", { params }),
  exportar: (filtros) => api.post("/pesquisa/exportar", filtros, { responseType: "blob" }),
  visualizar: (id) => api.get(`/pesquisa/${id}/visualizar`),
}

// APIs de Registros
export const registrosAPI = {
  listar: (params) => api.get("/registros/", { params }),
  criar: (data) => {
    // Não sobrescrever headers, deixar o interceptor adicionar o CSRF
    return api.post("/registros/", data)
  },
  obter: (id) => api.get(`/registros/${id}`),
  atualizar: (id, data) => api.put(`/registros/${id}`, data),
  deletar: (id) => api.delete(`/registros/${id}`),
  // ← CORREÇÃO CRÍTICA: Melhor tratamento do filename no download
  downloadAnexo: async (id, nomeOriginal = null) => {
    try {
      console.log("🔽 Baixando arquivo via backend proxy:", `/api/registros/${id}/download`)

      const response = await api.get(`/registros/${id}/download`, {
        responseType: "blob", // Importante para arquivos
        timeout: 60000, // 60 segundos para downloads grandes
      })

      // ← CORREÇÃO CRÍTICA: Melhor extração do filename
      const contentDisposition = response.headers["content-disposition"]
      let filename = nomeOriginal || `anexo_${id}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch) {
          const extractedFilename = filenameMatch[1].replace(/['"]/g, "")
          if (extractedFilename && extractedFilename !== "null" && extractedFilename !== "undefined") {
            filename = extractedFilename
          }
        }
      }
      // Criar URL do blob e fazer download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      return { success: true, filename }
    } catch (error) {
      console.error("❌ Erro ao baixar arquivo:", error)
      throw error
    }
  },
}

// APIs de Obras
export const obrasAPI = {
  listar: () => api.get("/obras/"),
  criar: (data) => api.post("/obras/", data),
  obter: (id) => api.get(`/obras/${id}`),
  atualizar: (id, data) => api.put(`/obras/${id}`, data),
  deletar: (id) => api.delete(`/obras/${id}`),
};

// APIs de Usuários
export const usuariosAPI = {
  listar: () => api.get("/users/"),
  criar: (data) => api.post("/users/", data),
  obter: (id) => api.get(`/users/${id}`),
  atualizar: (id, data) => api.put(`/users/${id}`, data),
  deletar: (id) => api.delete(`/users/${id}`),
};

// APIs de Tipos de Registro
export const tiposRegistroAPI = {
  listar: () => api.get("/tipos-registro/"),
  listarTodos: () => api.get("/tipos-registro/all"),
  criar: (data) => api.post("/tipos-registro/", data),
  obter: (id) => api.get(`/tipos-registro/${id}`),
  atualizar: (id, data) => api.put(`/tipos-registro/${id}`, data),
  deletar: (id) => api.delete(`/tipos-registro/${id}`),
};

// APIs de Classificações
export const classificacoesAPI = {
  listar: () => api.get("/classificacoes/"),
  grupos: () => api.get("/classificacoes/grupos"),
  subgrupos: (grupo) => api.get(`/classificacoes/subgrupos/${encodeURIComponent(grupo)}`),
  criar: (data) => api.post("/classificacoes/", data),
  atualizar: (id, data) => api.put(`/classificacoes/${id}`, data),
  deletar: (id) => api.delete(`/classificacoes/${id}`),
};

// APIs de Configurações
export const configuracoesAPI = {
  get: () => api.get("/configuracoes/"),
  save: (data) => api.post("/configuracoes/", data),
  backup: () => api.post("/configuracoes/backup"),
  reset: () => api.post("/configuracoes/reset"),
};

// APIs de Workflow
export const workflowAPI = {
  listar: () => api.get("/workflow/"),
  criar: (data) => api.post("/workflow/", data),
  atualizar: (id, data) => api.put(`/workflow/${id}`, data),
  deletar: (id) => api.delete(`/workflow/${id}`),
};

export default api;