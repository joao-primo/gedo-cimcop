"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react"

const Obras = () => {
  const [obras, setObras] = useState([])
  const [obraSelecionada, setObraSelecionada] = useState(null)
  const [formVisible, setFormVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" })

  const obraVazia = {
    nome: "",
    descricao: "",
    codigo: "",
    cliente: "",
    data_inicio: "",
    data_termino: "",
    responsavel_tecnico: "",
    responsavel_administrativo: "",
    localizacao: "",
    status: "",
  }

  const statusOptions = [
    { value: "Em andamento", label: "Em andamento", color: "bg-blue-100 text-blue-800" },
    { value: "Finalizada", label: "Finalizada", color: "bg-green-100 text-green-800" },
    { value: "Suspensa", label: "Suspensa", color: "bg-red-100 text-red-800" },
  ]

  const fetchObras = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const res = await fetch("/api/obras/", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setObras(data.obras || [])
    } catch (err) {
      console.error("Erro ao buscar obras:", err)
      setMensagem({ tipo: "error", texto: "Erro ao carregar obras." })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchObras()
  }, [])

  const salvarObra = async () => {
    const method = obraSelecionada?.id ? "PUT" : "POST"
    const url = obraSelecionada?.id ? `/api/obras/${obraSelecionada.id}/` : "/api/obras/"
    const token = localStorage.getItem("token")

    if (!token) {
      setMensagem({ tipo: "error", texto: "Token não encontrado. Faça login novamente." })
      return
    }

    try {
      setLoading(true)
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(obraSelecionada),
      })

      const data = await res.json()

      if (res.ok) {
        setMensagem({ tipo: "success", texto: "Obra salva com sucesso!" })
        setFormVisible(false)
        setObraSelecionada(null)
        fetchObras()
      } else {
        setMensagem({ tipo: "error", texto: data.message || "Erro ao salvar obra." })
      }
    } catch (error) {
      setMensagem({ tipo: "error", texto: "Erro ao conectar com o servidor." })
    } finally {
      setLoading(false)
    }
  }

  const excluirObra = async () => {
    if (!window.confirm("Tem certeza que deseja excluir esta obra?")) return

    const token = localStorage.getItem("token")
    const url = `/api/obras/${obraSelecionada.id}/`

    try {
      setLoading(true)
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setMensagem({ tipo: "success", texto: "Obra excluída com sucesso." })
        setFormVisible(false)
        setObraSelecionada(null)
        fetchObras()
      } else {
        const data = await res.json()
        setMensagem({ tipo: "error", texto: data.message || "Erro ao excluir obra." })
      }
    } catch (error) {
      setMensagem({ tipo: "error", texto: "Erro ao conectar com o servidor." })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setObraSelecionada({ ...obraSelecionada, [name]: value })
  }

  const handleSelectChange = (name, value) => {
    setObraSelecionada({ ...obraSelecionada, [name]: value })
  }

  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find((s) => s.value === status)
    return <Badge className={statusConfig?.color || "bg-gray-100 text-gray-800"}>{status || "Não definido"}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gestão de Obras</h2>
          <p className="text-gray-600">Gerencie todas as obras do sistema</p>
        </div>
        <Button
          onClick={() => {
            setObraSelecionada(obraVazia)
            setFormVisible(true)
            setMensagem({ tipo: "", texto: "" })
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Obra
        </Button>
      </div>

      {/* Mensagens */}
      {mensagem.texto && (
        <Alert
          className={`${mensagem.tipo === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
        >
          {mensagem.tipo === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={mensagem.tipo === "success" ? "text-green-700" : "text-red-700"}>
            {mensagem.texto}
          </AlertDescription>
        </Alert>
      )}

      {!formVisible ? (
        /* Lista de Obras */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Obras Cadastradas ({obras.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : obras.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhuma obra cadastrada</p>
                <p className="text-sm">Clique em "Nova Obra" para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Código</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Nome</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Responsável</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Início</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obras.map((obra) => (
                      <tr key={obra.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <Badge variant="outline">{obra.codigo}</Badge>
                        </td>
                        <td className="py-3 px-4 font-medium">{obra.nome}</td>
                        <td className="py-3 px-4">{obra.cliente}</td>
                        <td className="py-3 px-4">{obra.responsavel_tecnico}</td>
                        <td className="py-3 px-4">
                          {obra.data_inicio ? new Date(obra.data_inicio).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(obra.status)}</td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setObraSelecionada(obra)
                              setFormVisible(true)
                              setMensagem({ tipo: "", texto: "" })
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Formulário de Obra */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              {obraSelecionada?.id ? "Editar Obra" : "Nova Obra"}
            </CardTitle>
            <CardDescription>
              {obraSelecionada?.id ? "Edite as informações da obra" : "Preencha os dados da nova obra"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              {/* Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Obra *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={obraSelecionada.nome}
                    onChange={handleInputChange}
                    placeholder="Nome da obra"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    name="codigo"
                    value={obraSelecionada.codigo}
                    onChange={handleInputChange}
                    placeholder="OBR-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Input
                    id="cliente"
                    name="cliente"
                    value={obraSelecionada.cliente}
                    onChange={handleInputChange}
                    placeholder="Nome do cliente"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>Localização</span>
                  </Label>
                  <Input
                    name="localizacao"
                    value={obraSelecionada.localizacao}
                    onChange={handleInputChange}
                    placeholder="Cidade/Estado"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Data de Início</span>
                  </Label>
                  <Input
                    type="date"
                    name="data_inicio"
                    value={obraSelecionada.data_inicio}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Data de Término</span>
                  </Label>
                  <Input
                    type="date"
                    name="data_termino"
                    value={obraSelecionada.data_termino || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={obraSelecionada.status} onValueChange={(value) => handleSelectChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Responsável Técnico</span>
                  </Label>
                  <Input
                    name="responsavel_tecnico"
                    value={obraSelecionada.responsavel_tecnico}
                    onChange={handleInputChange}
                    placeholder="Nome do engenheiro"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Responsável Administrativo</span>
                  </Label>
                  <Input
                    name="responsavel_administrativo"
                    value={obraSelecionada.responsavel_administrativo}
                    onChange={handleInputChange}
                    placeholder="Nome do administrador"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  value={obraSelecionada.descricao}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Detalhes da obra..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <div>
                  {obraSelecionada?.id && (
                    <Button type="button" variant="destructive" onClick={excluirObra} disabled={loading}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  )}
                </div>
                <div className="flex space-x-3">
                  <Button type="button" variant="outline" onClick={() => setFormVisible(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={salvarObra} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Obras
