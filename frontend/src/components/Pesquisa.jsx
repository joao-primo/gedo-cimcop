"use client"

import { useState, useEffect, useContext } from "react"
import { AuthContext } from "../contexts/AuthContext"
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  FileText,
  Building2,
  Tag,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader,
} from "lucide-react"

const Pesquisa = () => {
  const { user } = useContext(AuthContext)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [registros, setRegistros] = useState([])
  const [filtros, setFiltros] = useState({})
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false)

  // Estados dos filtros
  const [filtrosPesquisa, setFiltrosPesquisa] = useState({
    palavra_chave: "",
    obra_id: "",
    tipo_registro_id: "",
    classificacao_grupo: "",
    data_registro_inicio: "",
    data_registro_fim: "",
    ordenacao: "data_desc",
  })

  // Paginação
  const [paginacao, setPaginacao] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  })

  useEffect(() => {
    carregarFiltros()
    pesquisar()
  }, [])

  const carregarFiltros = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/pesquisa/filtros", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setFiltros(data)
      } else {
        console.warn("Erro ao carregar filtros:", response.status)
      }
    } catch (err) {
      console.error("Erro ao carregar filtros:", err)
    }
  }

  const pesquisar = async (novaPagina = 1) => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams({
        page: novaPagina.toString(),
        per_page: paginacao.per_page.toString(),
        ...filtrosPesquisa,
      })

      // Remover parâmetros vazios
      for (const [key, value] of params.entries()) {
        if (!value || value === "") {
          params.delete(key)
        }
      }

      const token = localStorage.getItem("token")
      const response = await fetch(`/api/pesquisa?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRegistros(data.registros || [])
        setPaginacao({
          page: data.pagination?.page || 1,
          per_page: data.pagination?.per_page || 20,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 0,
        })
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Erro ao realizar pesquisa")
      }
    } catch (err) {
      console.error("Erro na pesquisa:", err)
      setError("Erro ao realizar pesquisa")
    } finally {
      setLoading(false)
    }
  }

  const handleFiltroChange = (campo, valor) => {
    setFiltrosPesquisa((prev) => ({
      ...prev,
      [campo]: valor,
    }))
  }

  const handleSubmitPesquisa = (e) => {
    e.preventDefault()
    pesquisar(1)
  }

  const limparFiltros = () => {
    setFiltrosPesquisa({
      palavra_chave: "",
      obra_id: "",
      tipo_registro_id: "",
      classificacao_grupo: "",
      data_registro_inicio: "",
      data_registro_fim: "",
      ordenacao: "data_desc",
    })
    setTimeout(() => pesquisar(1), 100)
  }

  const exportarResultados = async () => {
    try {
      setLoading(true)

      const token = localStorage.getItem("token")
      const response = await fetch("/api/pesquisa/exportar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filtrosPesquisa),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `pesquisa_registros_${new Date().toISOString().split("T")[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Erro ao exportar resultados")
      }
    } catch (err) {
      console.error("Erro ao exportar:", err)
      setError("Erro ao exportar resultados")
    } finally {
      setLoading(false)
    }
  }

  const visualizarRegistro = (registro) => {
    // Implementar modal de visualização ou navegação
    console.log("Visualizar registro:", registro)
  }

  const downloadAnexo = async (registroId) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/pesquisa/${registroId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `anexo_${registroId}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Erro ao baixar anexo")
      }
    } catch (err) {
      console.error("Erro ao baixar anexo:", err)
      setError("Erro ao baixar anexo")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesquisa Avançada</h1>
          <p className="text-gray-600">Encontre registros usando filtros avançados</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportarResultados}
            disabled={loading || registros.length === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Formulário de Pesquisa */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmitPesquisa} className="space-y-4">
          {/* Pesquisa por palavra-chave */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Palavra-chave</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filtrosPesquisa.palavra_chave}
                onChange={(e) => handleFiltroChange("palavra_chave", e.target.value)}
                placeholder="Buscar em título e descrição..."
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filtros Avançados */}
          <div>
            <button
              type="button"
              onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtros Avançados
              {filtrosExpandidos ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </button>

            {filtrosExpandidos && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Obra */}
                {user?.role === "administrador" && filtros.obras && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Obra</label>
                    <select
                      value={filtrosPesquisa.obra_id}
                      onChange={(e) => handleFiltroChange("obra_id", e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Todas as obras</option>
                      {filtros.obras.map((obra) => (
                        <option key={obra.id} value={obra.id}>
                          {obra.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tipo de Registro */}
                {filtros.tipos_registro && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Registro</label>
                    <select
                      value={filtrosPesquisa.tipo_registro_id}
                      onChange={(e) => handleFiltroChange("tipo_registro_id", e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Todos os tipos</option>
                      {filtros.tipos_registro.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Classificação */}
                {filtros.grupos_classificacao && filtros.grupos_classificacao.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Classificação</label>
                    <select
                      value={filtrosPesquisa.classificacao_grupo}
                      onChange={(e) => handleFiltroChange("classificacao_grupo", e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Todas as classificações</option>
                      {filtros.grupos_classificacao.map((grupo) => (
                        <option key={grupo} value={grupo}>
                          {grupo}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Data Início */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={filtrosPesquisa.data_registro_inicio}
                    onChange={(e) => handleFiltroChange("data_registro_inicio", e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Data Fim */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={filtrosPesquisa.data_registro_fim}
                    onChange={(e) => handleFiltroChange("data_registro_fim", e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Ordenação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
                  <select
                    value={filtrosPesquisa.ordenacao}
                    onChange={(e) => handleFiltroChange("ordenacao", e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="data_desc">Data (Mais Recente)</option>
                    <option value="data_asc">Data (Mais Antiga)</option>
                    <option value="titulo_asc">Título (A-Z)</option>
                    <option value="titulo_desc">Título (Z-A)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={limparFiltros}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Limpar Filtros
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Pesquisando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Pesquisar
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Resultados da Pesquisa</h3>
            <span className="text-sm text-gray-500">{paginacao.total} registro(s) encontrado(s)</span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-2 text-gray-500">Carregando resultados...</p>
          </div>
        ) : registros.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum resultado encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Tente ajustar os filtros de pesquisa.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {registros.map((registro) => (
              <div key={registro.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-medium text-gray-900 truncate">{registro.titulo}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{registro.descricao}</p>

                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      {registro.obra && (
                        <div className="flex items-center">
                          <Building2 className="h-3 w-3 mr-1" />
                          {registro.obra.nome}
                        </div>
                      )}

                      {registro.tipo_registro && (
                        <div className="flex items-center">
                          <Tag className="h-3 w-3 mr-1" />
                          {registro.tipo_registro}
                        </div>
                      )}

                      {registro.data_registro && (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(registro.data_registro).toLocaleDateString("pt-BR")}
                        </div>
                      )}

                      {registro.autor && (
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {registro.autor.username}
                        </div>
                      )}
                    </div>

                    {(registro.classificacao_grupo || registro.classificacao_subgrupo) && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {registro.classificacao_grupo}
                          {registro.classificacao_subgrupo && ` > ${registro.classificacao_subgrupo}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => visualizarRegistro(registro)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {registro.anexo_url && (
                      <button
                        onClick={() => downloadAnexo(registro.id)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Baixar anexo"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {paginacao.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {(paginacao.page - 1) * paginacao.per_page + 1} a{" "}
                {Math.min(paginacao.page * paginacao.per_page, paginacao.total)} de {paginacao.total} resultados
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => pesquisar(paginacao.page - 1)}
                  disabled={paginacao.page <= 1 || loading}
                  className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>

                <span className="px-3 py-1 text-sm text-gray-700">
                  Página {paginacao.page} de {paginacao.pages}
                </span>

                <button
                  onClick={() => pesquisar(paginacao.page + 1)}
                  disabled={paginacao.page >= paginacao.pages || loading}
                  className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Pesquisa
