"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { pesquisaAPI } from "../services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  Filter,
  Download,
  FileText,
  Calendar,
  Building2,
  User,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  FolderTree,
  FileDown,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

const Pesquisa = () => {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingFiltros, setLoadingFiltros] = useState(true)
  const [loadingExportacao, setLoadingExportacao] = useState(false)
  const [resultados, setResultados] = useState([])
  const [filtrosDisponiveis, setFiltrosDisponiveis] = useState({
    obras: [],
    tipos_registro: [],
    autores: [],
    classificacoes_existentes: [],
    opcoes_ordenacao: [],
  })
  const [paginacao, setPaginacao] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
    has_next: false,
    has_prev: false,
  })

  // ✅ NOVO: Estado para visualização completa
  const [registroVisualizacao, setRegistroVisualizacao] = useState(null)
  const [modalVisualizacaoAberto, setModalVisualizacaoAberto] = useState(false)

  const [filtros, setFiltros] = useState({
    palavra_chave: "",
    obra_id: "",
    tipo_registro_id: "",
    classificacao_grupo: "", // ✅ NOVO
    autor_id: "",
    data_registro_inicio: "",
    ordenacao: "data_desc",
  })

  // Carregar filtros disponíveis
  useEffect(() => {
    const carregarFiltros = async () => {
      try {
        setLoadingFiltros(true)
        console.log("Carregando filtros disponíveis...")

        const response = await pesquisaAPI.getFiltros()
        console.log("Filtros carregados:", response.data)

        setFiltrosDisponiveis({
          obras: response.data.obras || [],
          tipos_registro: response.data.tipos_registro || [],
          autores: response.data.autores || [],
          classificacoes_existentes: response.data.classificacoes_existentes || [], // ✅ NOVO
          opcoes_ordenacao: response.data.opcoes_ordenacao || [
            { value: "data_desc", label: "Data de Criação (Mais Recente)" },
            { value: "data_asc", label: "Data de Criação (Mais Antiga)" },
            { value: "titulo_asc", label: "Título (A-Z)" },
            { value: "titulo_desc", label: "Título (Z-A)" },
          ],
        })
      } catch (error) {
        console.error("Erro ao carregar filtros:", error)
        toast.error("Erro ao carregar filtros de pesquisa")
      } finally {
        setLoadingFiltros(false)
      }
    }

    if (user) {
      carregarFiltros()
    }
  }, [user])

  const realizarPesquisa = async (novaPagina = 1) => {
    try {
      setLoading(true)
      console.log("Realizando pesquisa com filtros:", filtros, "página:", novaPagina)

      const params = {
        ...filtros,
        page: novaPagina,
        per_page: paginacao.per_page,
      }

      // Remover parâmetros vazios
      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] === null || params[key] === undefined) {
          delete params[key]
        }
      })

      const response = await pesquisaAPI.pesquisar(params)
      console.log("Resultados da pesquisa:", response.data)

      setResultados(response.data.registros || [])
      setPaginacao(
        response.data.pagination || {
          page: 1,
          per_page: 20,
          total: 0,
          pages: 0,
          has_next: false,
          has_prev: false,
        },
      )
    } catch (error) {
      console.error("Erro na pesquisa:", error)
      toast.error("Erro ao realizar pesquisa")
      setResultados([])
    } finally {
      setLoading(false)
    }
  }

  const handleFiltroChange = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    realizarPesquisa(1)
  }

  const limparFiltros = () => {
    setFiltros({
      palavra_chave: "",
      obra_id: "",
      tipo_registro_id: "",
      classificacao_grupo: "", // ✅ NOVO
      autor_id: "",
      data_registro_inicio: "",
      ordenacao: "data_desc",
    })
    setResultados([])
    setPaginacao({
      page: 1,
      per_page: 20,
      total: 0,
      pages: 0,
      has_next: false,
      has_prev: false,
    })
  }

  const handlePaginacao = (novaPagina) => {
    realizarPesquisa(novaPagina)
  }

  // ✅ NOVO: Função para exportar resultados
  const exportarResultados = async () => {
    try {
      setLoadingExportacao(true)
      console.log("Iniciando exportação com filtros:", filtros)

      // Preparar dados para exportação (mesmos filtros da pesquisa)
      const dadosExportacao = {
        ...filtros,
      }

      // Remover campos vazios
      Object.keys(dadosExportacao).forEach((key) => {
        if (dadosExportacao[key] === "" || dadosExportacao[key] === null || dadosExportacao[key] === undefined) {
          delete dadosExportacao[key]
        }
      })

      console.log("Dados para exportação:", dadosExportacao)

      const response = await pesquisaAPI.exportar(dadosExportacao)

      // Criar blob e fazer download
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      // Nome do arquivo com timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
      link.download = `registros_gedo_cimcop_${timestamp}.xlsx`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("Exportação concluída com sucesso!")
      console.log("Exportação realizada com sucesso")
    } catch (error) {
      console.error("Erro na exportação:", error)
      if (error.response?.status === 404) {
        toast.error("Nenhum registro encontrado para exportar")
      } else {
        toast.error("Erro ao exportar resultados")
      }
    } finally {
      setLoadingExportacao(false)
    }
  }

  // ✅ NOVO: Função para visualizar registro completo
  const visualizarRegistro = async (registroId) => {
    try {
      console.log("Carregando registro para visualização:", registroId)

      const response = await pesquisaAPI.visualizar(registroId)
      console.log("Registro carregado:", response.data)

      setRegistroVisualizacao(response.data.registro)
      setModalVisualizacaoAberto(true)
    } catch (error) {
      console.error("Erro ao carregar registro:", error)
      toast.error("Erro ao carregar detalhes do registro")
    }
  }

  const formatarData = (dateString) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(dateString))
    } catch {
      return "Data inválida"
    }
  }

  const formatarDataHora = (dateString) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateString))
    } catch {
      return "Data inválida"
    }
  }

  if (loadingFiltros) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Carregando filtros de pesquisa...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pesquisa Avançada</h1>
          <p className="text-gray-600">Encontre registros usando filtros específicos</p>
        </div>
        {/* ✅ NOVO: Botão de Exportação */}
        {resultados.length > 0 && (
          <Button
            onClick={exportarResultados}
            disabled={loadingExportacao}
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
          >
            {loadingExportacao ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Exportar Excel
              </>
            )}
          </Button>
        )}
      </div>

      {/* Formulário de Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            Filtros de Pesquisa
          </CardTitle>
          <CardDescription>Use os filtros abaixo para refinar sua pesquisa</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Primeira linha de filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="palavra_chave">Palavra-chave</Label>
                <Input
                  id="palavra_chave"
                  value={filtros.palavra_chave}
                  onChange={(e) => handleFiltroChange("palavra_chave", e.target.value)}
                  placeholder="Buscar em título e descrição..."
                />
              </div>

              {isAdmin() && (
                <div className="space-y-2">
                  <Label htmlFor="obra_id">Obra</Label>
                  <Select value={filtros.obra_id} onValueChange={(value) => handleFiltroChange("obra_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as obras" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as obras</SelectItem>
                      {filtrosDisponiveis.obras.map((obra) => (
                        <SelectItem key={obra.id} value={obra.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {obra.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tipo_registro_id">Tipo de Registro</Label>
                <Select
                  value={filtros.tipo_registro_id}
                  onValueChange={(value) => handleFiltroChange("tipo_registro_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {filtrosDisponiveis.tipos_registro.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id.toString()}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Segunda linha de filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ✅ NOVO: Filtro por Classificação */}
              <div className="space-y-2">
                <Label htmlFor="classificacao_grupo">Classificação</Label>
                <Select
                  value={filtros.classificacao_grupo}
                  onValueChange={(value) => handleFiltroChange("classificacao_grupo", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as classificações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as classificações</SelectItem>
                    {filtrosDisponiveis.classificacoes_existentes.map((classificacao) => (
                      <SelectItem key={classificacao} value={classificacao}>
                        <div className="flex items-center gap-2">
                          <FolderTree className="h-4 w-4" />
                          {classificacao}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="autor_id">Autor</Label>
                <Select value={filtros.autor_id} onValueChange={(value) => handleFiltroChange("autor_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os autores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os autores</SelectItem>
                    {filtrosDisponiveis.autores.map((autor) => (
                      <SelectItem key={autor.id} value={autor.id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {autor.username}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_registro_inicio">Data do Registro</Label>
                <Input
                  id="data_registro_inicio"
                  type="date"
                  value={filtros.data_registro_inicio}
                  onChange={(e) => handleFiltroChange("data_registro_inicio", e.target.value)}
                />
              </div>
            </div>

            {/* Terceira linha - Ordenação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ordenacao">Ordenação</Label>
                <Select value={filtros.ordenacao} onValueChange={(value) => handleFiltroChange("ordenacao", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filtrosDisponiveis.opcoes_ordenacao.map((opcao) => (
                      <SelectItem key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-between items-center pt-4">
              <Button type="button" variant="outline" onClick={limparFiltros}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>

              <Button type="submit" disabled={loading} className="min-w-32">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Pesquisando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Pesquisar
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Resultados */}
      {resultados.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Resultados da Pesquisa
                </CardTitle>
                <CardDescription>{paginacao.total} registro(s) encontrado(s)</CardDescription>
              </div>
              {/* ✅ NOVO: Botão de exportação também no header dos resultados */}
              <Button onClick={exportarResultados} disabled={loadingExportacao} size="sm" variant="outline">
                {loadingExportacao ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resultados.map((registro) => (
                <div key={registro.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{registro.titulo}</h3>
                        <Badge variant="secondary">{registro.tipo_registro}</Badge>
                        {registro.tem_anexo && (
                          <Badge variant="outline" className="text-blue-600">
                            <FileText className="h-3 w-3 mr-1" />
                            Anexo
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatarData(registro.data_registro)}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {registro.autor_nome}
                        </div>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {registro.obra_nome}
                        </div>
                        {/* ✅ NOVO: Mostrar classificação na listagem */}
                        {registro.classificacao_completa && (
                          <div className="flex items-center gap-1">
                            <FolderTree className="h-4 w-4" />
                            <span className="truncate" title={registro.classificacao_completa}>
                              {registro.classificacao_completa}
                            </span>
                          </div>
                        )}
                      </div>

                      {registro.descricao && (
                        <p className="text-gray-700 text-sm line-clamp-2 mb-2">{registro.descricao}</p>
                      )}

                      {registro.codigo_numero && (
                        <div className="text-xs text-gray-500">Código: {registro.codigo_numero}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {/* ✅ NOVO: Botão de Visualização */}
                      <Button size="sm" variant="outline" onClick={() => visualizarRegistro(registro.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>

                      {registro.tem_anexo && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/api/pesquisa/${registro.id}/download`, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {paginacao.pages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Página {paginacao.page} de {paginacao.pages}({paginacao.total} registros)
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePaginacao(paginacao.page - 1)}
                    disabled={!paginacao.has_prev || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, paginacao.pages) }, (_, i) => {
                      const pageNum = Math.max(1, paginacao.page - 2) + i
                      if (pageNum > paginacao.pages) return null

                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === paginacao.page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePaginacao(pageNum)}
                          disabled={loading}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePaginacao(paginacao.page + 1)}
                    disabled={!paginacao.has_next || loading}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {!loading && resultados.length === 0 && paginacao.total === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum resultado encontrado</h3>
            <p className="text-gray-600 mb-4">Tente ajustar os filtros de pesquisa ou usar termos diferentes</p>
            <Button variant="outline" onClick={limparFiltros}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ✅ NOVO: Modal de Visualização Completa */}
      <Dialog open={modalVisualizacaoAberto} onOpenChange={setModalVisualizacaoAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Visualização Completa do Registro
            </DialogTitle>
            <DialogDescription>Detalhes completos do registro selecionado</DialogDescription>
          </DialogHeader>

          {registroVisualizacao && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Informações Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Título</Label>
                    <p className="text-lg font-semibold">{registroVisualizacao.titulo}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Tipo de Registro</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{registroVisualizacao.tipo_registro}</Badge>
                    </div>
                  </div>
                </div>

                {/* ✅ NOVO: Classificação na visualização */}
                {registroVisualizacao.classificacao_completa && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Classificação</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <FolderTree className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">
                        {registroVisualizacao.classificacao_completa}
                      </span>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Detalhes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Data do Registro</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {formatarData(registroVisualizacao.data_registro)}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Autor</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-gray-500" />
                      {registroVisualizacao.autor_nome}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Obra</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      {registroVisualizacao.obra_nome}
                    </div>
                  </div>
                </div>

                {registroVisualizacao.codigo_numero && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Código/Número</Label>
                    <p className="mt-1 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {registroVisualizacao.codigo_numero}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Descrição */}
                <div>
                  <Label className="text-sm font-medium text-gray-600">Descrição</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">{registroVisualizacao.descricao}</p>
                  </div>
                </div>

                {/* Anexo */}
                {registroVisualizacao.tem_anexo && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Anexo</Label>
                    <div className="mt-2 p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">
                              {registroVisualizacao.nome_arquivo_original || "Arquivo anexo"}
                            </p>
                            {registroVisualizacao.formato_arquivo && (
                              <p className="text-sm text-gray-500">
                                Formato: {registroVisualizacao.formato_arquivo.toUpperCase()}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => window.open(`/api/pesquisa/${registroVisualizacao.id}/download`, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Metadados */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Criado em</Label>
                    <p className="mt-1">{formatarDataHora(registroVisualizacao.created_at)}</p>
                  </div>

                  {registroVisualizacao.updated_at &&
                    registroVisualizacao.updated_at !== registroVisualizacao.created_at && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Atualizado em</Label>
                        <p className="mt-1">{formatarDataHora(registroVisualizacao.updated_at)}</p>
                      </div>
                    )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Pesquisa
