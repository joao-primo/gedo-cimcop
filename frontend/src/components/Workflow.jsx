import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import axios from "../services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  WorkflowIcon,
  Plus,
  Edit,
  Trash2,
  Mail,
  Building2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Play,
} from "lucide-react"

const Workflow = () => {
  const { user, isAdmin } = useAuth()
  const [workflows, setWorkflows] = useState([])
  const [workflowSelecionado, setWorkflowSelecionado] = useState(null)
  const [formVisible, setFormVisible] = useState(false)
  const [dadosAuxiliares, setDadosAuxiliares] = useState({ obras: [], tipos_registro: [] })
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" })

  const workflowVazio = {
    obra_id: "",
    nome: "",
    descricao: "",
    responsaveis_emails: [""],
    tipos_registro_ids: [],
    assunto_email: "",
    template_email: "",
    ativo: true,
    notificar_criacao: true,
    notificar_edicao: false,
    notificar_exclusao: false,
  }

  useEffect(() => {
    carregarWorkflows()
    carregarDadosAuxiliares()
  }, [])

  const carregarWorkflows = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/workflow/")

      // Verificar se a resposta tem workflows
      if (response.data && Array.isArray(response.data.workflows)) {
        setWorkflows(response.data.workflows)
      } else {
        console.warn("Resposta inesperada da API:", response.data)
        setWorkflows([])
      }

      setMensagem({ tipo: "", texto: "" }) // Limpar mensagens de erro anteriores
    } catch (error) {
      console.error("Erro detalhado:", error)
      setWorkflows([])

      if (error.response?.status === 500) {
        setMensagem({
          tipo: "error",
          texto: "Erro interno do servidor. Verifique os logs do backend.",
        })
      } else {
        setMensagem({
          tipo: "error",
          texto: error.response?.data?.message || "Erro ao carregar workflows.",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const carregarDadosAuxiliares = async () => {
    try {
      const response = await axios.get("/workflow/dados-auxiliares")
      setDadosAuxiliares(response.data)
    } catch (error) {
      console.error("Erro ao carregar dados auxiliares:", error)
    }
  }

  const salvarWorkflow = async () => {
    try {
      setLoading(true)

      // Validações
      if (!workflowSelecionado.obra_id || !workflowSelecionado.nome) {
        setMensagem({ tipo: "error", texto: "Obra e nome são obrigatórios." })
        return
      }

      const emailsValidos = workflowSelecionado.responsaveis_emails.filter((email) => email.trim() !== "")
      if (emailsValidos.length === 0) {
        setMensagem({ tipo: "error", texto: "Pelo menos um email responsável é obrigatório." })
        return
      }

      const dadosEnvio = {
        ...workflowSelecionado,
        responsaveis_emails: emailsValidos,
      }

      if (workflowSelecionado.id) {
        await axios.put(`/workflow/${workflowSelecionado.id}`, dadosEnvio)
        setMensagem({ tipo: "success", texto: "Workflow atualizado com sucesso!" })
      } else {
        await axios.post("/workflow/", dadosEnvio)
        setMensagem({ tipo: "success", texto: "Workflow criado com sucesso!" })
      }

      setFormVisible(false)
      setWorkflowSelecionado(null)
      carregarWorkflows()
    } catch (error) {
      setMensagem({ tipo: "error", texto: error.response?.data?.message || "Erro ao salvar workflow." })
    } finally {
      setLoading(false)
    }
  }

  const excluirWorkflow = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este workflow?")) return

    try {
      setLoading(true)
      await axios.delete(`/workflow/${workflowSelecionado.id}`)
      setMensagem({ tipo: "success", texto: "Workflow excluído com sucesso!" })
      setFormVisible(false)
      setWorkflowSelecionado(null)
      carregarWorkflows()
    } catch (error) {
      setMensagem({ tipo: "error", texto: "Erro ao excluir workflow." })
    } finally {
      setLoading(false)
    }
  }

  const testarWorkflow = async (workflowId) => {
    try {
      setLoading(true)
      const response = await axios.post(`/workflow/${workflowId}/testar`)
      setMensagem({ tipo: "success", texto: "Teste de workflow executado com sucesso!" })
    } catch (error) {
      setMensagem({ tipo: "error", texto: "Erro ao testar workflow." })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (campo, valor) => {
    setWorkflowSelecionado({ ...workflowSelecionado, [campo]: valor })
  }

  const handleEmailChange = (index, valor) => {
    const novosEmails = [...workflowSelecionado.responsaveis_emails]
    novosEmails[index] = valor
    setWorkflowSelecionado({ ...workflowSelecionado, responsaveis_emails: novosEmails })
  }

  const adicionarEmail = () => {
    setWorkflowSelecionado({
      ...workflowSelecionado,
      responsaveis_emails: [...workflowSelecionado.responsaveis_emails, ""],
    })
  }

  const removerEmail = (index) => {
    const novosEmails = workflowSelecionado.responsaveis_emails.filter((_, i) => i !== index)
    setWorkflowSelecionado({ ...workflowSelecionado, responsaveis_emails: novosEmails })
  }

  const getObraNome = (obraId) => {
    const obra = dadosAuxiliares.obras.find((o) => o.id === obraId)
    return obra ? obra.nome : "Obra não encontrada"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Workflows de Notificação</h2>
          <p className="text-gray-600">Configure notificações automáticas por email para registros</p>
        </div>
        <Button
          onClick={() => {
            setWorkflowSelecionado({ ...workflowVazio, obra_id: user?.obra_id || "" })
            setFormVisible(true)
            setMensagem({ tipo: "", texto: "" })
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Workflow
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
        /* Lista de Workflows */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <WorkflowIcon className="mr-2 h-5 w-5" />
              Workflows Configurados ({workflows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <WorkflowIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhum workflow configurado</p>
                <p className="text-sm">Clique em "Novo Workflow" para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{workflow.nome}</h3>
                          <Badge variant={workflow.ativo ? "default" : "secondary"}>
                            {workflow.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4" />
                            <span>{workflow.obra_nome}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>{workflow.responsaveis_emails.length} responsável(is)</span>
                          </div>
                        </div>

                        {workflow.descricao && <p className="text-sm text-gray-600 mt-2">{workflow.descricao}</p>}

                        <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                          {workflow.notificar_criacao && <span>✓ Criação</span>}
                          {workflow.notificar_edicao && <span>✓ Edição</span>}
                          {workflow.notificar_exclusao && <span>✓ Exclusão</span>}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testarWorkflow(workflow.id)}
                          disabled={loading}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setWorkflowSelecionado(workflow)
                            setFormVisible(true)
                            setMensagem({ tipo: "", texto: "" })
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Formulário de Workflow */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <WorkflowIcon className="mr-2 h-5 w-5" />
              {workflowSelecionado?.id ? "Editar Workflow" : "Novo Workflow"}
            </CardTitle>
            <CardDescription>Configure as notificações automáticas por email</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Obra *</Label>
                  <Select
                    value={workflowSelecionado.obra_id?.toString() || ""}
                    onValueChange={(value) => handleInputChange("obra_id", Number.parseInt(value))}
                    disabled={!isAdmin() && user?.obra_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {dadosAuxiliares.obras.map((obra) => (
                        <SelectItem key={obra.id} value={obra.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{obra.codigo}</Badge>
                            <span>{obra.nome}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nome do Workflow *</Label>
                  <Input
                    value={workflowSelecionado.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    placeholder="Ex: Notificação de Novos Registros"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={workflowSelecionado.descricao}
                  onChange={(e) => handleInputChange("descricao", e.target.value)}
                  placeholder="Descreva o propósito deste workflow..."
                  rows={3}
                />
              </div>

              <Separator />

              {/* Emails Responsáveis */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Emails dos Responsáveis *</Label>
                  <Button type="button" size="sm" variant="outline" onClick={adicionarEmail}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Email
                  </Button>
                </div>

                {workflowSelecionado.responsaveis_emails.map((email, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      placeholder="email@exemplo.com"
                      className="flex-1"
                    />
                    {workflowSelecionado.responsaveis_emails.length > 1 && (
                      <Button type="button" size="sm" variant="outline" onClick={() => removerEmail(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              {/* Configurações de Notificação */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Quando Notificar</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Criação de registros</Label>
                    <Switch
                      checked={workflowSelecionado.notificar_criacao}
                      onCheckedChange={(checked) => handleInputChange("notificar_criacao", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Edição de registros</Label>
                    <Switch
                      checked={workflowSelecionado.notificar_edicao}
                      onCheckedChange={(checked) => handleInputChange("notificar_edicao", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Exclusão de registros</Label>
                    <Switch
                      checked={workflowSelecionado.notificar_exclusao}
                      onCheckedChange={(checked) => handleInputChange("notificar_exclusao", checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Filtros Opcionais */}
              <div className="space-y-2">
                <Label>Filtrar por Tipos de Registro (opcional)</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const tiposAtuais = workflowSelecionado.tipos_registro_ids || []
                    if (!tiposAtuais.includes(Number.parseInt(value))) {
                      handleInputChange("tipos_registro_ids", [...tiposAtuais, Number.parseInt(value)])
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar tipo de registro" />
                  </SelectTrigger>
                  <SelectContent>
                    {dadosAuxiliares.tipos_registro.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id.toString()}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {workflowSelecionado.tipos_registro_ids?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {workflowSelecionado.tipos_registro_ids.map((tipoId) => {
                      const tipo = dadosAuxiliares.tipos_registro.find((t) => t.id === tipoId)
                      return (
                        <Badge key={tipoId} variant="secondary" className="cursor-pointer">
                          {tipo?.nome}
                          <button
                            type="button"
                            onClick={() => {
                              const novosTipos = workflowSelecionado.tipos_registro_ids.filter((id) => id !== tipoId)
                              handleInputChange("tipos_registro_ids", novosTipos)
                            }}
                            className="ml-2 hover:text-red-600"
                          >
                            ×
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* Personalização do Email */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Personalização do Email</Label>
                <div className="space-y-2">
                  <Label>Assunto do Email</Label>
                  <Input
                    value={workflowSelecionado.assunto_email}
                    onChange={(e) => handleInputChange("assunto_email", e.target.value)}
                    placeholder="Ex: Novo registro adicionado - {obra}"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Template Personalizado (HTML)</Label>
                  <Textarea
                    value={workflowSelecionado.template_email}
                    onChange={(e) => handleInputChange("template_email", e.target.value)}
                    placeholder="Deixe em branco para usar o template padrão..."
                    rows={6}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Workflow Ativo</Label>
                <Switch
                  checked={workflowSelecionado.ativo}
                  onCheckedChange={(checked) => handleInputChange("ativo", checked)}
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-between pt-6 border-t">
                <div>
                  {workflowSelecionado?.id && (
                    <Button type="button" variant="destructive" onClick={excluirWorkflow} disabled={loading}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  )}
                </div>
                <div className="flex space-x-3">
                  <Button type="button" variant="outline" onClick={() => setFormVisible(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={salvarWorkflow} disabled={loading}>
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

export default Workflow
