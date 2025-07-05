"use client"

import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import axios from "../services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, FileText, X } from "lucide-react"

const ImportacaoLote = ({ onClose, onSuccess }) => {
  const { user } = useAuth()
  const [etapa, setEtapa] = useState(1) // 1: Upload, 2: Revisão, 3: Anexos, 4: Finalização
  const [arquivo, setArquivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [registrosProcessados, setRegistrosProcessados] = useState([])
  const [erros, setErros] = useState([])
  const [estatisticas, setEstatisticas] = useState({})
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" })
  const [progresso, setProgresso] = useState(0)

  const downloadTemplate = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/importacao/template", {
        responseType: "blob",
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `template_importacao_${new Date().toISOString().split("T")[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setMensagem({ tipo: "success", texto: "Template baixado com sucesso!" })
    } catch (error) {
      setMensagem({ tipo: "error", texto: "Erro ao baixar template." })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setArquivo(file)
      setMensagem({ tipo: "", texto: "" })
    }
  }

  const processarPlanilha = async () => {
    if (!arquivo) {
      setMensagem({ tipo: "error", texto: "Selecione um arquivo primeiro." })
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append("arquivo", arquivo)

      const response = await axios.post("/importacao/processar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      setRegistrosProcessados(response.data.registros)
      setErros(response.data.erros)
      setEstatisticas({
        total: response.data.total_linhas,
        validos: response.data.total_validos,
        erros: response.data.total_erros,
      })

      if (response.data.registros.length > 0) {
        setEtapa(2)
        setMensagem({ tipo: "success", texto: `${response.data.total_validos} registros válidos encontrados!` })
      } else {
        setMensagem({ tipo: "error", texto: "Nenhum registro válido encontrado na planilha." })
      }
    } catch (error) {
      setMensagem({ tipo: "error", texto: error.response?.data?.message || "Erro ao processar planilha." })
    } finally {
      setLoading(false)
    }
  }

  const handleAnexoUpload = async (idTemp, file) => {
    try {
      const formData = new FormData()
      formData.append("arquivo", file)

      const response = await axios.post("/importacao/upload-anexo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      // Atualizar registro com dados do anexo
      setRegistrosProcessados((prev) =>
        prev.map((reg) =>
          reg.id_temp === idTemp
            ? {
                ...reg,
                anexo_path: response.data.anexo_path,
                nome_arquivo_original: response.data.nome_arquivo_original,
                formato_arquivo: response.data.formato_arquivo,
                tamanho_arquivo: response.data.tamanho_arquivo,
                anexo_enviado: true,
              }
            : reg,
        ),
      )

      return true
    } catch (error) {
      console.error("Erro ao enviar anexo:", error)
      return false
    }
  }

  const finalizarImportacao = async () => {
    const registrosSemAnexo = registrosProcessados.filter((reg) => !reg.anexo_enviado)

    if (registrosSemAnexo.length > 0) {
      setMensagem({
        tipo: "error",
        texto: `${registrosSemAnexo.length} registros ainda precisam de anexos.`,
      })
      return
    }

    try {
      setLoading(true)
      setEtapa(4)

      const response = await axios.post("/importacao/finalizar", {
        registros: registrosProcessados,
      })

      setMensagem({ tipo: "success", texto: response.data.message })

      // Simular progresso
      for (let i = 0; i <= 100; i += 10) {
        setProgresso(i)
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      setTimeout(() => {
        onSuccess?.()
        onClose?.()
      }, 1000)
    } catch (error) {
      setMensagem({ tipo: "error", texto: error.response?.data?.message || "Erro ao finalizar importação." })
      setEtapa(3)
    } finally {
      setLoading(false)
    }
  }

  // CORRIGIDO: Função para fechar o modal
  const handleClose = (e) => {
    // Prevenir propagação do evento se necessário
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    // Confirmar se o usuário realmente quer sair
    if (etapa > 1 && !loading) {
      const confirmar = window.confirm("Tem certeza que deseja sair? O progresso será perdido.")
      if (!confirmar) return
    }

    // Chamar a função de fechamento
    if (onClose && typeof onClose === "function") {
      onClose()
    }
  }

  const RegistroCard = ({ registro }) => {
    const [anexoFile, setAnexoFile] = useState(null)
    const [enviandoAnexo, setEnviandoAnexo] = useState(false)

    const handleAnexoChange = async (e) => {
      const file = e.target.files[0]
      if (file) {
        setAnexoFile(file)
        setEnviandoAnexo(true)
        const sucesso = await handleAnexoUpload(registro.id_temp, file)
        setEnviandoAnexo(false)
        if (!sucesso) {
          setAnexoFile(null)
        }
      }
    }

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-lg">{registro.titulo}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
                <div>
                  <strong>Tipo:</strong> {registro.tipo_registro}
                </div>
                <div>
                  <strong>Data:</strong> {registro.data_registro}
                </div>
                <div>
                  <strong>Código:</strong> {registro.codigo_numero}
                </div>
                <div>
                  <strong>Obra:</strong> {registro.obra_nome}
                </div>
              </div>
              <div className="mt-2">
                <strong>Descrição:</strong>
                <p className="text-sm text-gray-600 mt-1">{registro.descricao}</p>
              </div>
            </div>
            <div className="ml-4">
              {registro.anexo_enviado ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Anexo OK
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Sem Anexo
                </Badge>
              )}
            </div>
          </div>

          <div className="border-t pt-3">
            <Label className="text-sm font-medium">Anexar Documento *</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Input
                type="file"
                onChange={handleAnexoChange}
                disabled={enviandoAnexo || registro.anexo_enviado}
                className="flex-1"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
              />
              {enviandoAnexo && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            {registro.anexo_enviado && (
              <p className="text-xs text-green-600 mt-1">✓ Arquivo: {registro.nome_arquivo_original}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Importação em Lote</h2>
            <p className="text-gray-600">Importe múltiplos registros via planilha</p>
          </div>
          {/* CORRIGIDO: Botão X funcional */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="hover:bg-gray-100 p-2"
            disabled={loading}
            type="button"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-white">
          {/* Mensagens */}
          {mensagem.texto && (
            <Alert
              className={`mb-6 ${
                mensagem.tipo === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
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

          {/* Etapa 1: Upload da Planilha */}
          {etapa === 1 && (
            <div className="space-y-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Download className="mr-2 h-5 w-5" />
                    1. Baixar Template
                  </CardTitle>
                  <CardDescription>Baixe o template Excel com o formato correto para importação</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={downloadTemplate} disabled={loading} variant="outline">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Baixar Template Excel
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="mr-2 h-5 w-5" />
                    2. Enviar Planilha Preenchida
                  </CardTitle>
                  <CardDescription>
                    Selecione a planilha Excel (.xlsx, .xls) ou CSV preenchida com os dados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Arquivo da Planilha *</Label>
                    <Input type="file" onChange={handleFileChange} accept=".xlsx,.xls,.csv" className="mt-2" />
                    {arquivo && <p className="text-sm text-green-600 mt-2">✓ Arquivo selecionado: {arquivo.name}</p>}
                  </div>

                  <Button onClick={processarPlanilha} disabled={!arquivo || loading} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Processar Planilha
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Etapa 2: Revisão dos Dados */}
          {etapa === 2 && (
            <div className="space-y-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle>Revisão dos Dados</CardTitle>
                  <CardDescription>Verifique os dados processados antes de continuar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{estatisticas.total}</div>
                      <div className="text-sm text-gray-600">Total de Linhas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{estatisticas.validos}</div>
                      <div className="text-sm text-gray-600">Registros Válidos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{estatisticas.erros}</div>
                      <div className="text-sm text-gray-600">Erros Encontrados</div>
                    </div>
                  </div>

                  <Tabs defaultValue="validos" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="validos">Registros Válidos ({estatisticas.validos})</TabsTrigger>
                      <TabsTrigger value="erros">Erros ({estatisticas.erros})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="validos" className="space-y-4">
                      <div className="max-h-96 overflow-y-auto">
                        {registrosProcessados.map((registro) => (
                          <Card key={registro.id_temp} className="mb-3 bg-white border border-gray-200">
                            <CardContent className="p-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold">{registro.titulo}</h4>
                                  <p className="text-sm text-gray-600">Tipo: {registro.tipo_registro}</p>
                                  <p className="text-sm text-gray-600">Data: {registro.data_registro}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Código: {registro.codigo_numero}</p>
                                  <p className="text-sm text-gray-600">Obra: {registro.obra_nome}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="erros" className="space-y-4">
                      <div className="max-h-96 overflow-y-auto">
                        {erros.map((erro, index) => (
                          <Card key={index} className="mb-3 border-red-200 bg-red-50">
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                <div className="flex-1">
                                  <h4 className="font-semibold text-red-700">Linha {erro.linha}</h4>
                                  <ul className="text-sm text-red-600 mt-1">
                                    {erro.erros.map((msg, i) => (
                                      <li key={i}>• {msg}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setEtapa(1)}>
                      Voltar
                    </Button>
                    <Button onClick={() => setEtapa(3)} disabled={registrosProcessados.length === 0}>
                      Continuar para Anexos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Etapa 3: Upload de Anexos */}
          {etapa === 3 && (
            <div className="space-y-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle>Anexar Documentos</CardTitle>
                  <CardDescription>
                    Anexe um documento para cada registro. Todos os anexos são obrigatórios.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>
                        Progresso: {registrosProcessados.filter((r) => r.anexo_enviado).length} de{" "}
                        {registrosProcessados.length}
                      </span>
                      <span>
                        {Math.round(
                          (registrosProcessados.filter((r) => r.anexo_enviado).length / registrosProcessados.length) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        (registrosProcessados.filter((r) => r.anexo_enviado).length / registrosProcessados.length) * 100
                      }
                      className="mt-2"
                    />
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {registrosProcessados.map((registro) => (
                      <RegistroCard key={registro.id_temp} registro={registro} />
                    ))}
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setEtapa(2)}>
                      Voltar
                    </Button>
                    <Button
                      onClick={finalizarImportacao}
                      disabled={registrosProcessados.some((r) => !r.anexo_enviado) || loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Finalizando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Finalizar Importação
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Etapa 4: Finalização */}
          {etapa === 4 && (
            <div className="space-y-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Finalizando Importação
                  </CardTitle>
                  <CardDescription>Criando registros e processando workflows...</CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={progresso} className="mb-4" />
                  <p className="text-center text-gray-600">{progresso < 100 ? "Processando..." : "Concluído!"}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportacaoLote
