"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Search, Filter, Eye, Download, FileText, Calendar, Building2, Tag } from "lucide-react"
import api from "../services/api"

const Pesquisa = () => {
  const [loading, setLoading] = useState(false)
  const [registros, setRegistros] = useState([])
  const [filtros, setFiltros] = useState({
    palavra_chave: "",
    obra_id: "",
    tipo_registro_id: "",
    data_registro_inicio: "",
    data_registro_fim: "",
    classificacao_grupo: "",
    classificacao_subgrupo: "",
  })
  const [obras, setObras] = useState([])
  const [tiposRegistro, setTiposRegistro] = useState([])
  const [classificacoes, setClassificacoes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [subgrupos, setSubgrupos] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  })
  const [selectedRegistro, setSelectedRegistro] = useState(null)

  useEffect(() => {
    fetchFiltros()
    buscarRegistros()
  }, [])

  useEffect(() => {
    buscarRegistros()
  }, [pagination.page])

  useEffect(() => {
    // Quando o grupo muda, atualizar os subgrupos disponíveis
    if (filtros.classificacao_grupo) {
      const subgruposDoGrupo = classificacoes.filter((c) => c.grupo === filtros.classificacao_grupo)
      setSubgrupos(subgruposDoGrupo)

      // Limpar subgrupo se não for válido para o novo grupo
      if (filtros.classificacao_subgrupo) {
        const subgrupoValido = subgruposDoGrupo.find((s) => s.subgrupo === filtros.classificacao_subgrupo)
        if (!subgrupoValido) {
          setFiltros((prev) => ({ ...prev, classificacao_subgrupo: "" }))
        }
      }
    } else {
      setSubgrupos([])
      setFiltros((prev) => ({ ...prev, classificacao_subgrupo: "" }))
    }
  }, [filtros.classificacao_grupo, classificacoes])

  const fetchFiltros = async () => {
    try {
      const [obrasRes, tiposRes, classificacoesRes] = await Promise.all([
        api.get("/obras/"),
        api.get("/tipos-registro/"),
        api.get("/classificacoes/"),
      ])

      setObras(obrasRes.data || [])
      setTiposRegistro(tiposRes.data || [])
      setClassificacoes(classificacoesRes.data || [])

      // Extrair grupos únicos
      const gruposUnicos = [...new Set((classificacoesRes.data || []).map((c) => c.grupo))].filter(Boolean).sort()
      setGrupos(gruposUnicos)
    } catch (error) {
      console.error("Erro ao carregar filtros:", error)
      toast.error("Erro ao carregar filtros")
    }
  }

  const buscarRegistros = async (resetPage = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      // Adicionar filtros não vazios
      Object.keys(filtros).forEach((key) => {
        if (filtros[key] && filtros[key] !== "0" && filtros[key] !== "") {
          params.append(key, filtros[key])
        }
      })

      // Paginação
      const currentPage = resetPage ? 1 : pagination.page
      params.append("page", currentPage.toString())
      params.append("per_page", pagination.per_page.toString())

      const response = await api.get(`/pesquisa/?${params.toString()}`)

      if (response.data) {
        setRegistros(response.data.registros || [])
        setPagination({
          page: response.data.page || 1,
          per_page: response.data.per_page || 20,
          total: response.data.total || 0,
          pages: response.data.pages || 0,
        })
      } else {
        setRegistros([])
        setPagination((prev) => ({ ...prev, total: 0, pages: 0 }))
      }
    } catch (error) {
      console.error("Erro ao buscar registros:", error)
      toast.error("Erro ao buscar registros")
      setRegistros([])
      setPagination((prev) => ({ ...prev, total: 0, pages: 0 }))
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

  const handleBuscar = () => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    buscarRegistros(true)
  }

  const limparFiltros = () => {
    setFiltros({
      palavra_chave: "",
      obra_id: "",
      tipo_registro_id: "",
      data_registro_inicio: "",
      data_registro_fim: "",
      classificacao_grupo: "",
      classificacao_subgrupo: "",
    })
    setPagination((prev) => ({ ...prev, page: 1 }))
    setTimeout(() => buscarRegistros(true), 100)
  }

  const exportarResultados = async () => {
    try {
      const params = new URLSearchParams()
      Object.keys(filtros).forEach((key) => {
        if (filtros[key] && filtros[key] !== "0") {
          params.append(key, filtros[key])
        }
      })

      const response = await api.get(`/pesquisa/exportar?${params.toString()}`, {
        responseType: "blob",
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `registros_${new Date().toISOString().split("T")[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success("Exportação realizada com sucesso!")
    } catch (error) {
      console.error("Erro ao exportar:", error)
      toast.error("Erro ao exportar resultados")
    }
  }

  const formatarData = (dataString) => {
    if (!dataString) return ""
    try {
      return new Date(dataString).toLocaleDateString("pt-BR")
    } catch {
      return dataString
    }
  }

  const getObraNome = (obraId) => {
    const obra = obras.find((o) => o.id === obraId)
    return obra ? obra.nome : "Obra não encontrada"
  }

  const getTipoNome = (tipoId) => {
    const tipo = tiposRegistro.find((t) => t.id === tipoId)
    return tipo ? tipo.nome : "Tipo não encontrado"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesquisa de Registros</h1>
          <p className="text-gray-600">Busque e filtre registros no sistema</p>
        </div>
        {registros.length > 0 && (
          <Button onClick={exportarResultados} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros de Pesquisa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Palavra-chave */}
            <div className="space-y-2">
              <Label htmlFor="palavra_chave">Palavra-chave</Label>
              <Input
                id="palavra_chave"
                placeholder="Buscar na descrição..."
                value={filtros.palavra_chave}
                onChange={(e) => handleFiltroChange("palavra_chave", e.target.value)}
              />
            </div>

            {/* Obra */}
            <div className="space-y-2">
              <Label htmlFor="obra">Obra</Label>
              <Select value={filtros.obra_id} onValueChange={(value) => handleFiltroChange("obra_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as obras" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todas as obras</SelectItem>
                  {obras.map((obra) => (
                    <SelectItem key={obra.id} value={obra.id.toString()}>
                      {obra.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Registro */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Registro</Label>
              <Select
                value={filtros.tipo_registro_id}
                onValueChange={(value) => handleFiltroChange("tipo_registro_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos os tipos</SelectItem>
                  {tiposRegistro.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id.toString()}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Classificação Grupo */}
            <div className="space-y-2">
              <Label htmlFor="grupo">Classificação Grupo</Label>
              <Select
                value={filtros.classificacao_grupo}
                onValueChange={(value) => handleFiltroChange("classificacao_grupo", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos os grupos</SelectItem>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo} value={grupo}>
                      {grupo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Classificação Subgrupo */}
            <div className="space-y-2">
              <Label htmlFor="subgrupo">Classificação Subgrupo</Label>
              <Select
                value={filtros.classificacao_subgrupo}
                onValueChange={(value) => handleFiltroChange("classificacao_subgrupo", value)}
                disabled={!filtros.classificacao_grupo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os subgrupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos os subgrupos</SelectItem>
                  {subgrupos.map((item) => (
                    <SelectItem key={item.id} value={item.subgrupo}>
                      {item.subgrupo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Início */}
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data Início</Label>
              <Input
                id="data_inicio"
                type="date"
                value={filtros.data_registro_inicio}
                onChange={(e) => handleFiltroChange("data_registro_inicio", e.target.value)}
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label htmlFor="data_fim">Data Fim</Label>
              <Input
                id="data_fim"
                type="date"
                value={filtros.data_registro_fim}
                onChange={(e) => handleFiltroChange("data_registro_fim", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <Button variant="outline" onClick={limparFiltros}>
              Limpar Filtros
            </Button>
            <Button onClick={handleBuscar} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resultados da Pesquisa
            {pagination.total > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({pagination.total} registro{pagination.total !== 1 ? "s" : ""} encontrado
                {pagination.total !== 1 ? "s" : ""})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Buscando registros...</span>
            </div>
          ) : registros.length > 0 ? (
            <div className="space-y-4">
              {registros.map((registro) => (
                <div key={registro.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">
                          <Building2 className="h-3 w-3 mr-1" />
                          {getObraNome(registro.obra_id)}
                        </Badge>
                        <Badge variant="secondary">
                          <FileText className="h-3 w-3 mr-1" />
                          {getTipoNome(registro.tipo_registro_id)}
                        </Badge>
                        {registro.classificacao_grupo && (
                          <Badge variant="outline">
                            <Tag className="h-3 w-3 mr-1" />
                            {registro.classificacao_grupo}
                            {registro.classificacao_subgrupo && ` / ${registro.classificacao_subgrupo}`}
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-medium text-gray-900 mb-1">{registro.descricao || "Sem descrição"}</h3>

                      {registro.observacoes && <p className="text-sm text-gray-600 mb-2">{registro.observacoes}</p>}

                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatarData(registro.data_registro)}
                        {registro.anexos_count > 0 && (
                          <span className="ml-4">
                            📎 {registro.anexos_count} anexo{registro.anexos_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRegistro(registro)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Detalhes do Registro</DialogTitle>
                        </DialogHeader>
                        {selectedRegistro && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="font-medium">Obra:</Label>
                                <p>{getObraNome(selectedRegistro.obra_id)}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Tipo:</Label>
                                <p>{getTipoNome(selectedRegistro.tipo_registro_id)}</p>
                              </div>
                              <div>
                                <Label className="font-medium">Data:</Label>
                                <p>{formatarData(selectedRegistro.data_registro)}</p>
                              </div>
                              {selectedRegistro.classificacao_grupo && (
                                <div>
                                  <Label className="font-medium">Classificação:</Label>
                                  <p>
                                    {selectedRegistro.classificacao_grupo}
                                    {selectedRegistro.classificacao_subgrupo &&
                                      ` / ${selectedRegistro.classificacao_subgrupo}`}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div>
                              <Label className="font-medium">Descrição:</Label>
                              <p className="mt-1">{selectedRegistro.descricao}</p>
                            </div>

                            {selectedRegistro.observacoes && (
                              <div>
                                <Label className="font-medium">Observações:</Label>
                                <p className="mt-1">{selectedRegistro.observacoes}</p>
                              </div>
                            )}

                            {selectedRegistro.anexos_count > 0 && (
                              <div>
                                <Label className="font-medium">Anexos:</Label>
                                <p className="mt-1">
                                  {selectedRegistro.anexos_count} arquivo
                                  {selectedRegistro.anexos_count !== 1 ? "s" : ""} anexado
                                  {selectedRegistro.anexos_count !== 1 ? "s" : ""}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}

              {/* Paginação */}
              {pagination.pages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Anterior
                  </Button>

                  <span className="text-sm text-gray-600">
                    Página {pagination.page} de {pagination.pages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum registro encontrado</p>
              <p className="text-sm">Tente ajustar os filtros de pesquisa</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Pesquisa
