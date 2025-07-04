"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { pesquisaAPI, registrosAPI } from "../services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Search,
  Download,
  RefreshCw,
  FileText,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckCircle,
  Eye,
  FileSpreadsheet,
  Calendar,
  Building2,
  Tag,
  X,
} from "lucide-react"

const formatDate = (dateStr) => {
  if (!dateStr) return "—"
  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(dateStr))
  } catch {
    return "—"
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return "—"
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr))
  } catch {
    return "—"
  }
}

const Pesquisa = () => {
  const { user, isAdmin } = useAuth()
  const [filtros, setFiltros] = useState({
    obras: [],
    tipos_registro: [],
    autores: [],
  })
  const [form, setForm] = useState({
    data_registro_inicio: "",
    obra_id: "0",
    tipo_registro_id: "0",
    palavra_chave: "",
  })
  const [registros, setRegistros] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
    has_prev: false,
    has_next: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Estados para visualização de registro
  const [registroSelecionado, setRegistroSelecionado] = useState(null)
  const [modalVisualizacao, setModalVisualizacao] = useState(false)
  const [loadingVisualizacao, setLoadingVisualizacao] = useState(false)

  useEffect(() => {
    console.log("Componente Pesquisa montado, carregando filtros...")
    fetchFiltros()
    fetchRegistros()
  }, [])

  const fetchFiltros = async () => {
    try {
      console.log("Buscando filtros...")
      const response = await pesquisaAPI.getFiltros()
      console.log("Filtros recebidos:", response.data)

      setFiltros({
        obras: response.data.obras || [],
        tipos_registro: response.data.tipos_registro || [],
        autores: response.data.autores || [],
      })
    } catch (err) {
      console.error("Erro ao buscar filtros:", err)
      setError("Erro ao carregar filtros de pesquisa")
    }
  }

  const fetchRegistros = async (page = 1) => {
    setLoading(true)
    setError("")

    try {
      console.log("Buscando registros com parâmetros:", { ...form, page, per_page: pagination.per_page })

      const response = await pesquisaAPI.pesquisar({
        ...form,
        page,
        per_page: pagination.per_page,
      })

      console.log("Resposta da pesquisa:", response.data)

      setRegistros(response.data.registros || [])
      setPagination({
        page: response.data.pagination?.page || 1,
        per_page: response.data.pagination?.per_page || 20,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0,
        has_prev: response.data.pagination?.has_prev || false,
        has_next: response.data.pagination?.has_next || false,
      })
    } catch (err) {
      console.error("Erro ao buscar registros:", err)
      setError("Erro ao realizar pesquisa")
      setRegistros([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (name, value) => {
    console.log("Alterando filtro:", name, "=", value)
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    handleChange(name, value)
  }

  const handleClear = () => {
    console.log("Limpando filtros...")
    setForm({
      data_registro_inicio: "",
      obra_id: "0",
      tipo_registro_id: "0",
      palavra_chave: "",
    })
    fetchRegistros(1)
  }

  const handleSearch = () => {
    console.log("Executando pesquisa...")
    fetchRegistros(1)
  }

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true)
      setError("")

      console.log("Exportando registros para Excel...")

      const result = await pesquisaAPI.exportar(form)

      console.log("Exportação concluída:", result.filename)

      setSuccessMessage(`Arquivo "${result.filename}" exportado com sucesso!`)
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error("Erro ao exportar:", err)
      setError(err.message || "Erro ao exportar registros. Tente novamente.")
    } finally {
      setExportingExcel(false)
    }
  }

  const handleVisualizarRegistro = async (registroId) => {
    try {
      setLoadingVisualizacao(true)
      setError("")

      console.log("Carregando dados completos do registro:", registroId)

      const response = await pesquisaAPI.visualizar(registroId)
      setRegistroSelecionado(response.data)
      setModalVisualizacao(true)
    } catch (err) {
      console.error("Erro ao carregar registro:", err)
      setError(err.message || "Erro ao carregar dados do registro.")
    } finally {
      setLoadingVisualizacao(false)
    }
  }

  const handleDownload = async (registroId, nomeArquivo) => {
    try {
      setDownloadingId(registroId)
      setError("")

      console.log("Baixando arquivo do registro:", registroId)

      const result = await registrosAPI.downloadAnexo(registroId)

      console.log("Download concluído:", result.filename)

      setSuccessMessage(`Arquivo "${result.filename}" baixado com sucesso!`)
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      console.error("Erro ao baixar arquivo:", err)
      setError(err.message || "Erro ao baixar o arquivo. Tente novamente.")
    } finally {
      setDownloadingId(null)
    }
  }

  const canDeleteRecord = (registro) => {
    if (!user) return false

    // Admin pode excluir qualquer registro
    if (user.role === "administrador") return true

    // Autor pode excluir seus próprios registros
    if (registro.autor_nome === user.username) return true

    return false
  }

  const handleDelete = async (registro) => {
    // Verificar permissões
    if (!canDeleteRecord(registro)) {
      setError("Você não tem permissão para excluir este registro.")
      return
    }

    // Confirmação dupla
    const confirmMessage = `Tem certeza que deseja excluir o registro "${registro.titulo}"?\n\nEsta ação não pode ser desfeita!`

    if (!window.confirm(confirmMessage)) {
      return
    }

    // Segunda confirmação para registros com anexo
    if (registro.anexo_url) {
      const confirmWithAttachment = window.confirm(
        `ATENÇÃO: Este registro possui um anexo que também será excluído permanentemente.\n\nDeseja realmente continuar?`,
      )
      if (!confirmWithAttachment) {
        return
      }
    }

    try {
      setDeletingId(registro.id)
      setError("")
      setSuccessMessage("")

      console.log("Excluindo registro:", registro.id)

      await registrosAPI.deletar(registro.id)

      setSuccessMessage(`Registro "${registro.titulo}" excluído com sucesso!`)

      // Atualizar lista de registros
      fetchRegistros(pagination.page)

      // Limpar mensagem de sucesso após 5 segundos
      setTimeout(() => {
        setSuccessMessage("")
      }, 5000)
    } catch (err) {
      console.error("Erro ao excluir registro:", err)

      if (err.response?.status === 403) {
        setError("Você não tem permissão para excluir este registro.")
      } else if (err.response?.status === 404) {
        setError("Registro não encontrado.")
      } else {
        setError(err.response?.data?.message || "Erro ao excluir registro. Tente novamente.")
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handlePageChange = (newPage) => {
    console.log("Mudando para página:", newPage)
    fetchRegistros(newPage)
  }

  // Se não há usuário, mostrar loading
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Pesquisa Avançada</h2>
            <p className="text-gray-600 mt-1">Encontre registros usando filtros personalizados</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportExcel} disabled={exportingExcel || registros.length === 0} variant="outline">
              {exportingExcel ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Exportar Excel
            </Button>
            <Button onClick={fetchFiltros} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Filtros
            </Button>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Filtros de Pesquisa */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Filtros de Pesquisa
            </CardTitle>
            <CardDescription>Use os filtros abaixo para refinar sua pesquisa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="palavra_chave">Palavra-chave</Label>
                <Input
                  id="palavra_chave"
                  name="palavra_chave"
                  placeholder="Buscar em título, descrição..."
                  value={form.palavra_chave}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="data_registro_inicio">Data (a partir de)</Label>
                <Input
                  id="data_registro_inicio"
                  name="data_registro_inicio"
                  type="date"
                  value={form.data_registro_inicio}
                  onChange={handleInputChange}
                />
              </div>

              {isAdmin() && (
                <div>
                  <Label htmlFor="obra_id">Obra</Label>
                  <Select value={form.obra_id} onValueChange={(value) => handleChange("obra_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma obra" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Todas as obras</SelectItem>
                      {filtros.obras.map((obra) => (
                        <SelectItem key={obra.id} value={obra.id.toString()}>
                          {obra.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="tipo_registro_id">Tipo de Registro</Label>
                <Select
                  value={form.tipo_registro_id}
                  onValueChange={(value) => handleChange("tipo_registro_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Todos os tipos</SelectItem>
                    {filtros.tipos_registro.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id.toString()}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Pesquisar
              </Button>
              <Button onClick={handleClear} variant="outline">
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Resultados da Pesquisa
                </CardTitle>
                <CardDescription>
                  {pagination.total > 0
                    ? `${pagination.total} registro${pagination.total !== 1 ? "s" : ""} encontrado${
                        pagination.total !== 1 ? "s" : ""
                      }`
                    : "Nenhum registro encontrado"}
                </CardDescription>
              </div>
              {pagination.total > 0 && (
                <Badge variant="secondary">
                  Página {pagination.page} de {pagination.pages}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Carregando registros...</p>
                </div>
              </div>
            ) : registros.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</h3>
                <p className="text-gray-600">Tente ajustar os filtros de pesquisa</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Classificação</TableHead>
                        <TableHead>Data</TableHead>
                        {isAdmin() && <TableHead>Obra</TableHead>}
                        <TableHead>Autor</TableHead>
                        <TableHead>Anexo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registros.map((registro) => (
                        <TableRow key={registro.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900">{registro.titulo}</div>
                              {registro.codigo_numero && (
                                <div className="text-sm text-gray-500">#{registro.codigo_numero}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{registro.tipo_registro}</Badge>
                          </TableCell>
                          <TableCell>
                            {registro.classificacao_grupo ? (
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">{registro.classificacao_grupo}</div>
                                <div className="text-gray-500">{registro.classificacao_subgrupo}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{formatDate(registro.data_registro)}</div>
                              <div className="text-gray-500">{formatDateTime(registro.created_at)}</div>
                            </div>
                          </TableCell>
                          {isAdmin() && (
                            <TableCell>
                              <div className="flex items-center text-sm">
                                <Building2 className="h-3 w-3 mr-1 text-gray-400" />
                                Obra #{registro.obra_id}
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <User className="h-3 w-3 mr-1 text-gray-400" />
                              {registro.autor_nome}
                            </div>
                          </TableCell>
                          <TableCell>
                            {registro.anexo_url ? (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                <FileText className="h-3 w-3 mr-1" />
                                Sim
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-400 border-gray-200">
                                Não
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleVisualizarRegistro(registro.id)}
                                disabled={loadingVisualizacao}
                                title="Visualizar registro completo"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {registro.anexo_url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownload(registro.id, registro.nome_arquivo_original)}
                                  disabled={downloadingId === registro.id}
                                  title="Baixar anexo"
                                >
                                  {downloadingId === registro.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {canDeleteRecord(registro) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(registro)}
                                  disabled={deletingId === registro.id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Excluir registro"
                                >
                                  {deletingId === registro.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-600">
                      Mostrando {(pagination.page - 1) * pagination.per_page + 1} a{" "}
                      {Math.min(pagination.page * pagination.per_page, pagination.total)} de {pagination.total}{" "}
                      registros
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.has_prev}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="text-sm text-gray-600">
                        Página {pagination.page} de {pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.has_next}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal de Visualização de Registro */}
        <Dialog open={modalVisualizacao} onOpenChange={setModalVisualizacao}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Detalhes do Registro
                </DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => setModalVisualizacao(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription>Visualização completa dos dados do registro</DialogDescription>
            </DialogHeader>

            {loadingVisualizacao ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : registroSelecionado ? (
              <div className="space-y-6">
                {/* Informações Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Título</Label>
                        <p className="text-gray-900 font-medium">{registroSelecionado.titulo}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Tipo de Registro</Label>
                        <Badge variant="secondary" className="mt-1">
                          {registroSelecionado.tipo_registro}
                        </Badge>
                      </div>
                      {registroSelecionado.codigo_numero && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Código/Número</Label>
                          <p className="text-gray-900">#{registroSelecionado.codigo_numero}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Data do Registro</Label>
                        <p className="text-gray-900">{formatDate(registroSelecionado.data_registro)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Classificação e Contexto</h3>
                    <div className="space-y-3">
                      {registroSelecionado.classificacao_grupo && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Classificação</Label>
                          <div className="mt-1">
                            <Badge variant="outline" className="mb-1">
                              <Tag className="h-3 w-3 mr-1" />
                              {registroSelecionado.classificacao_grupo}
                            </Badge>
                            <p className="text-sm text-gray-600">{registroSelecionado.classificacao_subgrupo}</p>
                          </div>
                        </div>
                      )}
                      {isAdmin() && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Obra</Label>
                          <div className="flex items-center mt-1">
                            <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="text-gray-900">Obra #{registroSelecionado.obra_id}</span>
                          </div>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Autor</Label>
                        <div className="flex items-center mt-1">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-gray-900">{registroSelecionado.autor_nome}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Criado em</Label>
                        <div className="flex items-center mt-1">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-gray-900">{formatDateTime(registroSelecionado.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                {registroSelecionado.descricao && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Descrição</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap">{registroSelecionado.descricao}</p>
                    </div>
                  </div>
                )}

                {/* Anexo */}
                {registroSelecionado.anexo_url && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Anexo</h3>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-8 w-8 text-blue-600 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {registroSelecionado.nome_arquivo_original || "Arquivo anexo"}
                            </p>
                            <p className="text-sm text-gray-600">
                              {registroSelecionado.formato_arquivo?.toUpperCase()} •
                              {registroSelecionado.tamanho_arquivo
                                ? ` ${(registroSelecionado.tamanho_arquivo / 1024).toFixed(1)} KB`
                                : " Tamanho não disponível"}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() =>
                            handleDownload(registroSelecionado.id, registroSelecionado.nome_arquivo_original)
                          }
                          disabled={downloadingId === registroSelecionado.id}
                        >
                          {downloadingId === registroSelecionado.id ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Baixar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Erro ao carregar dados do registro</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default Pesquisa
