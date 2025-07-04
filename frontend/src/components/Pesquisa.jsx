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
} from "lucide-react"

const formatDate = (dateStr) => {
  if (!dateStr) return "—"
  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(dateStr))
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
  const [downloadingId, setDownloadingId] = useState(null) // ← ADICIONADO: Estado para download
  const [successMessage, setSuccessMessage] = useState("")

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

  // ← CORRIGIDO: Usar a API correta para download
  const handleDownload = async (registroId, nomeArquivo) => {
    try {
      setDownloadingId(registroId)
      setError("")

      console.log("Baixando arquivo do registro:", registroId)

      // Usar a função da API que já está configurada corretamente
      const result = await registrosAPI.downloadAnexo(registroId)

      console.log("Download concluído:", result.filename)

      // Mostrar mensagem de sucesso temporária
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
          <Button onClick={fetchFiltros} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Filtros
          </Button>
        </div>

        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Filtros de Pesquisa
            </CardTitle>
            <CardDescription>Use os filtros abaixo para refinar sua pesquisa</CardDescription>
          </CardHeader>
          <CardContent>
            {/* ← MODIFICADO: Primeira linha com Data, Obra e Tipo de Registro */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="data_registro_inicio">Data do Registro</Label>
                <Input
                  id="data_registro_inicio"
                  type="date"
                  name="data_registro_inicio"
                  value={form.data_registro_inicio}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>

              {isAdmin() && (
                <div>
                  <Label htmlFor="obra_id">Obra</Label>
                  <Select value={form.obra_id} onValueChange={(value) => handleChange("obra_id", value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todas as obras" />
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
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos os tipos" />
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

            {/* ← NOVO: Segunda linha só com Palavra-chave */}
            <div className="mb-6">
              <div>
                <Label htmlFor="palavra_chave">Palavra-chave</Label>
                <Input
                  id="palavra_chave"
                  type="text"
                  name="palavra_chave"
                  value={form.palavra_chave}
                  onChange={handleInputChange}
                  placeholder="Busque por título, descrição..."
                  className="mt-1"
                />
              </div>
            </div>

            {/* ← MANTIDO: Botões de ação logo embaixo da palavra-chave */}
            <div className="flex gap-3">
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Pesquisar
              </Button>

              <Button onClick={handleClear} variant="outline" disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Resultados da Pesquisa
              </span>
              {pagination.total > 0 && (
                <Badge variant="secondary">
                  {pagination.total} registro{pagination.total !== 1 ? "s" : ""} encontrado
                  {pagination.total !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Carregando...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Data</TableHead>
                      {isAdmin() && <TableHead>Obra</TableHead>}
                      <TableHead>Tipo</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Autor</TableHead>
                      <TableHead className="w-80">Descrição</TableHead>
                      <TableHead className="w-40 text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registros.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin() ? 7 : 6} className="text-center py-12">
                          <div className="flex flex-col items-center text-gray-500">
                            <FileText className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">Nenhum registro encontrado</p>
                            <p className="text-sm">Tente ajustar os filtros de pesquisa</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      registros.map((registro) => (
                        <TableRow key={registro.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{formatDate(registro.data_registro)}</TableCell>
                          {isAdmin() && (
                            <TableCell>
                              <Badge variant="outline">{registro.obra_nome || "—"}</Badge>
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge variant="secondary">{registro.tipo_registro_nome || "—"}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{registro.titulo}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-1 text-gray-400" />
                              {registro.autor_nome || "—"}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={registro.descricao}>
                              {registro.descricao || "—"}
                            </div>
                          </TableCell>
                          {/* ← MELHORADO: Layout dos botões mais bonito */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Botão de Download - Melhorado */}
                              {registro.anexo_url ? (
                                <Button
                                  onClick={() => handleDownload(registro.id, registro.nome_arquivo_original)}
                                  size="sm"
                                  variant="ghost"
                                  disabled={downloadingId === registro.id}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                  title={`Baixar anexo: ${registro.nome_arquivo_original || "arquivo"}`}
                                >
                                  {downloadingId === registro.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : (
                                <div className="h-8 w-8"></div> // Espaço para manter alinhamento
                              )}

                              {/* Botão de Excluir - Melhorado */}
                              {canDeleteRecord(registro) && (
                                <Button
                                  onClick={() => handleDelete(registro)}
                                  size="sm"
                                  variant="ghost"
                                  disabled={deletingId === registro.id}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                                  title={`Excluir registro: ${registro.titulo}`}
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginação */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(pagination.page - 1) * pagination.per_page + 1}</span> até{" "}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.per_page, pagination.total)}
                  </span>{" "}
                  de <span className="font-medium">{pagination.total}</span> resultados
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.has_prev || loading}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-600">
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  <Button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.has_next || loading}
                    variant="outline"
                    size="sm"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Pesquisa
