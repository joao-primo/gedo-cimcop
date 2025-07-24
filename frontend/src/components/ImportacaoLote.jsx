"use client"

import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import axios from "../services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
                blob_url: response.data.blob_url,
                blob_pathname: response.data.blob_pathname,
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

      // Simular progresso
      for (let i = 0; i <= 100; i += 10) {
        setProgresso(i)
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // Finalizar com sucesso
      setMensagem({ tipo: "success", texto: response.data.message })
      setLoading(false)

      // Aguardar um pouco e então fechar/redirecionar
      setTimeout(() => {
        if (onSuccess && typeof onSuccess === "function") {
          onSuccess()
        }
        if (onClose && typeof onClose === "function") {
          onClose()
        } else {
          // Se não há função de fechamento, redirecionar para dashboard
          window.location.href = "/dashboard"
        }
      }, 2000)
    } catch (error) {
      setMensagem({ tipo: "error", texto: error.response?.data?.message || "Erro ao finalizar importação." })
      setEtapa(3)
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
            <div className="mt-2">
              <div className="relative">
                <input
                  type="file"
                  onChange={handleAnexoChange}
                  disabled={enviandoAnexo || registro.anexo_enviado}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
                />
                <div
                  className={`border-2 border-dashed rounded-lg p-4 transition-all duration-200 ${
                    registro.anexo_enviado
                      ? "border-green-300 bg-green-50"
                      : enviandoAnexo
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {enviandoAnexo ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    ) : registro.anexo_enviado ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Upload className="h-5 w-5 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {registro.anexo_enviado
                          ? `✓ ${registro.nome_arquivo_original}`
                          : enviandoAnexo
                            ? "Enviando arquivo..."
                            : "Clique para selecionar arquivo"}
                      </div>
                      <p className="text-xs text-gray-500">PDF, DOC, XLS, PNG, JPG, etc.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Importação em Lote</h1>
              <p className="text-gray-600 mt-2">Importe múltiplos registros via planilha Excel</p>
            </div>
          </div>
        </div>

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
          <div className="space-y-8">
            {/* Card Principal - Botão Central */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-12 text-center">
                <div className="mb-8">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload className="h-12 w-12 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Importar Registros</h2>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Clique no botão abaixo para começar a importação de registros em lote
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={() => setEtapa(1.5)} // Etapa intermediária para seleção de arquivo
                    size="lg"
                    className="h-16 px-8 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-3 h-6 w-6" />
                        Iniciar Importação
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      <span>Planilha Excel</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span>Processamento Automático</span>
                    </div>
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      <span>Download de Anexos</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Informações */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileSpreadsheet className="mr-2 h-5 w-5" />
                  Como Funciona
                </CardTitle>
                <CardDescription>Passo a passo da importação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <h3 className="font-semibold mb-2">Baixar Template</h3>
                    <p className="text-sm text-gray-600">Use o template Excel com o formato correto</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-green-600 font-bold">2</span>
                    </div>
                    <h3 className="font-semibold mb-2">Preencher Dados</h3>
                    <p className="text-sm text-gray-600">Adicione os registros na planilha</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-purple-600 font-bold">3</span>
                    </div>
                    <h3 className="font-semibold mb-2">Importar</h3>
                    <p className="text-sm text-gray-600">Faça upload e processe automaticamente</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <Button
                    onClick={downloadTemplate}
                    disabled={loading}
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando Template...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Template Excel
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Etapa 1.5: Seleção de Arquivo */}
        {etapa === 1.5 && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Selecionar Arquivo
                </CardTitle>
                <CardDescription>Escolha a planilha Excel preenchida para importação</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Arquivo da Planilha *</Label>
                    <div className="mt-3">
                      <div className="relative">
                        <input
                          type="file"
                          onChange={handleFileChange}
                          accept=".xlsx,.xls,.csv"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          id="file-upload"
                        />
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                          <div className="text-center">
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <div className="text-lg font-medium text-gray-900 mb-2">
                              {arquivo ? arquivo.name : "Clique para selecionar arquivo"}
                            </div>
                            <p className="text-sm text-gray-500">Ou arraste e solte o arquivo aqui</p>
                            <p className="text-xs text-gray-400 mt-2">Formatos aceitos: .xlsx, .xls, .csv</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {arquivo && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-green-800 font-medium">Arquivo selecionado: {arquivo.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setArquivo(null)}
                            className="ml-auto text-green-600 hover:text-green-800"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setEtapa(1)} className="flex-1">
                      Voltar
                    </Button>
                    <Button onClick={processarPlanilha} disabled={!arquivo || loading} className="flex-1" size="lg">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Etapa 2: Revisão dos Dados */}
        {etapa === 2 && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Revisão dos Dados
                </CardTitle>
                <CardDescription>Verifique os dados processados antes de continuar</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{estatisticas.total}</div>
                    <div className="text-sm text-gray-600">Total de Linhas</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{estatisticas.validos}</div>
                    <div className="text-sm text-gray-600">Registros Válidos</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-3xl font-bold text-red-600">{estatisticas.erros}</div>
                    <div className="text-sm text-gray-600">Erros Encontrados</div>
                  </div>
                </div>

                <Tabs defaultValue="validos" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="validos">Registros Válidos ({estatisticas.validos})</TabsTrigger>
                    <TabsTrigger value="erros">Erros ({estatisticas.erros})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="validos" className="space-y-4 mt-6">
                    <div className="max-h-96 overflow-y-auto">
                      {registrosProcessados.map((registro) => (
                        <Card key={registro.id_temp} className="mb-3 border-green-200 bg-green-50">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-green-800">{registro.titulo}</h4>
                                <p className="text-sm text-green-700">Tipo: {registro.tipo_registro}</p>
                                <p className="text-sm text-green-700">Data: {registro.data_registro}</p>
                              </div>
                              <div>
                                <p className="text-sm text-green-700">Código: {registro.codigo_numero}</p>
                                <p className="text-sm text-green-700">Obra: {registro.obra_nome}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="erros" className="space-y-4 mt-6">
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

                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button variant="outline" onClick={() => setEtapa(1.5)}>
                    Voltar
                  </Button>
                  <Button onClick={() => setEtapa(3)} disabled={registrosProcessados.length === 0} size="lg">
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
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Anexar Documentos
                </CardTitle>
                <CardDescription>
                  Anexe um documento para cada registro. Todos os anexos são obrigatórios.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
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
                    className="h-3"
                  />
                </div>

                <div className="max-h-96 overflow-y-auto space-y-4">
                  {registrosProcessados.map((registro) => (
                    <RegistroCard key={registro.id_temp} registro={registro} />
                  ))}
                </div>

                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button variant="outline" onClick={() => setEtapa(2)}>
                    Voltar
                  </Button>
                  <Button
                    onClick={finalizarImportacao}
                    disabled={registrosProcessados.some((r) => !r.anexo_enviado) || loading}
                    size="lg"
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
            <Card className="shadow-lg">
              <CardHeader
                className={`border-b ${loading ? "bg-gradient-to-r from-blue-50 to-indigo-50" : "bg-gradient-to-r from-green-50 to-emerald-50"}`}
              >
                <CardTitle className="flex items-center">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Finalizando Importação
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                      Importação Concluída
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {loading
                    ? "Criando registros e processando workflows..."
                    : "Todos os registros foram importados com sucesso!"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      loading ? "bg-blue-100" : "bg-green-100"
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                    ) : (
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{loading ? "Processando..." : "Concluído!"}</h3>
                  <p className="text-gray-600">
                    {loading
                      ? "Aguarde enquanto finalizamos a importação"
                      : "A importação foi finalizada com sucesso. Redirecionando..."}
                  </p>
                </div>

                <Progress value={progresso} className="h-3 mb-4" />
                <p className="text-gray-600">{progresso < 100 ? `${progresso}% concluído` : "100% concluído"}</p>

                {!loading && (
                  <div className="mt-6">
                    <Button onClick={() => (window.location.href = "/dashboard")} className="px-8 py-3">
                      Ir para Dashboard
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportacaoLote
