"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Save, ArrowLeft, Upload, X } from "lucide-react"
import api from "../services/api"

const RegistroForm = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState([])
  const [tiposRegistro, setTiposRegistro] = useState([])
  const [classificacoes, setClassificacoes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [subgrupos, setSubgrupos] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])

  const [formData, setFormData] = useState({
    obra_id: "",
    tipo_registro_id: "",
    descricao: "",
    observacoes: "",
    classificacao_grupo: "",
    classificacao_subgrupo: "",
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    // Quando o grupo muda, atualizar os subgrupos disponíveis
    if (formData.classificacao_grupo) {
      const subgruposDoGrupo = classificacoes.filter((c) => c.grupo === formData.classificacao_grupo)
      setSubgrupos(subgruposDoGrupo)

      // Limpar subgrupo se não for válido para o novo grupo
      if (formData.classificacao_subgrupo) {
        const subgrupoValido = subgruposDoGrupo.find((s) => s.subgrupo === formData.classificacao_subgrupo)
        if (!subgrupoValido) {
          setFormData((prev) => ({ ...prev, classificacao_subgrupo: "" }))
        }
      }
    } else {
      setSubgrupos([])
      setFormData((prev) => ({ ...prev, classificacao_subgrupo: "" }))
    }
  }, [formData.classificacao_grupo, classificacoes])

  const fetchInitialData = async () => {
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
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados do formulário")
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files)
    setSelectedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.obra_id || !formData.tipo_registro_id || !formData.descricao) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    setLoading(true)

    try {
      const submitData = new FormData()

      // Adicionar dados do formulário
      Object.keys(formData).forEach((key) => {
        if (formData[key]) {
          submitData.append(key, formData[key])
        }
      })

      // Adicionar arquivos
      selectedFiles.forEach((file) => {
        submitData.append("arquivos", file)
      })

      await api.post("/registros/", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      toast.success("Registro criado com sucesso!")
      navigate("/dashboard")
    } catch (error) {
      console.error("Erro ao criar registro:", error)
      toast.error(error.response?.data?.detail || "Erro ao criar registro")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Novo Registro</h1>
            <p className="text-gray-600">Criar um novo registro no sistema</p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Registro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Obra */}
              <div className="space-y-2">
                <Label htmlFor="obra">Obra *</Label>
                <Select value={formData.obra_id} onValueChange={(value) => handleInputChange("obra_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma obra" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="tipo">Tipo de Registro *</Label>
                <Select
                  value={formData.tipo_registro_id}
                  onValueChange={(value) => handleInputChange("tipo_registro_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                  <SelectContent>
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
                  value={formData.classificacao_grupo}
                  onValueChange={(value) => handleInputChange("classificacao_grupo", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um grupo" />
                  </SelectTrigger>
                  <SelectContent>
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
                  value={formData.classificacao_subgrupo}
                  onValueChange={(value) => handleInputChange("classificacao_subgrupo", value)}
                  disabled={!formData.classificacao_grupo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um subgrupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {subgrupos.map((item) => (
                      <SelectItem key={item.id} value={item.subgrupo}>
                        {item.subgrupo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o registro..."
                value={formData.descricao}
                onChange={(e) => handleInputChange("descricao", e.target.value)}
                rows={4}
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações adicionais..."
                value={formData.observacoes}
                onChange={(e) => handleInputChange("observacoes", e.target.value)}
                rows={3}
              />
            </div>

            {/* Upload de Arquivos */}
            <div className="space-y-2">
              <Label htmlFor="arquivos">Anexos</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Clique para fazer upload ou arraste arquivos aqui
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, PDF até 10MB cada</p>
                  </div>
                </div>
              </div>

              {/* Lista de arquivos selecionados */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>Arquivos selecionados:</Label>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Registro
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegistroForm
