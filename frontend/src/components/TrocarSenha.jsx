"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { authAPI } from "../services/api" // ← ÚNICA ADIÇÃO
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Shield,
  Key,
  Clock,
  Info,
  UserCheck,
} from "lucide-react"

const TrocarSenha = () => {
  const { user, logout, updateUser } = useAuth()
  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState("")
  const [loading, setLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState(null)
  const navigate = useNavigate()

  // Buscar status da senha ao carregar
  useEffect(() => {
    fetchPasswordStatus()
  }, [])

  const fetchPasswordStatus = async () => {
    try {
      const response = await authAPI.getPasswordStatus() // ← CORREÇÃO
      setPasswordStatus(response.data.password_status)
    } catch (error) {
      console.error("Erro ao buscar status da senha:", error)
    }
  }

  const validatePassword = (password) => {
    const minLength = password.length >= 6
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)

    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      isValid: minLength && hasUpper && hasLower && hasNumber,
    }
  }

  const passwordValidation = validatePassword(novaSenha)

  const handleTrocarSenha = async (e) => {
    e.preventDefault()
    setErro("")
    setSucesso("")

    // Validações
    if (!senhaAtual) {
      setErro("Digite sua senha atual.")
      return
    }

    if (novaSenha !== confirmacao) {
      setErro("As senhas não coincidem.")
      return
    }

    if (!passwordValidation.isValid) {
      setErro("A nova senha não atende aos critérios de segurança.")
      return
    }

    try {
      setLoading(true)

      const response = await authAPI.changePassword({
        // ← CORREÇÃO
        current_password: senhaAtual,
        new_password: novaSenha,
      })

      setSucesso("Senha alterada com sucesso!")

      // Atualizar status da senha
      if (response.data.password_status) {
        setPasswordStatus(response.data.password_status)
      }

      // Atualizar dados do usuário
      const updatedUser = { ...user, must_change_password: false, password_changed_by_admin: false }
      updateUser(updatedUser)

      // Limpar campos
      setSenhaAtual("")
      setNovaSenha("")
      setConfirmacao("")

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate("/dashboard")
      }, 2000)
    } catch (err) {
      console.error("Erro ao alterar senha:", err)
      setErro(err.response?.data?.message || "Erro ao alterar a senha.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Nunca"
    return new Date(dateString).toLocaleString("pt-BR")
  }

  const getDaysUntilNextChange = () => {
    if (!passwordStatus?.next_change_allowed) return null

    const nextChange = new Date(passwordStatus.next_change_allowed)
    const now = new Date()
    const diffTime = nextChange - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays > 0 ? diffDays : 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Status da Senha */}
        {passwordStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Status da Senha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Última alteração */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Última alteração:</span>
                  </div>
                  <span className="text-sm text-gray-600">{formatDate(passwordStatus.last_change)}</span>
                </div>

                {/* Status de alteração obrigatória */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Alteração obrigatória:</span>
                  </div>
                  <Badge variant={passwordStatus.must_change ? "destructive" : "secondary"}>
                    {passwordStatus.must_change ? "Sim" : "Não"}
                  </Badge>
                </div>

                {/* Para administradores - mostrar restrição */}
                {user?.role === "administrador" && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Pode alterar:</span>
                      </div>
                      <Badge variant={passwordStatus.can_change_own ? "secondary" : "destructive"}>
                        {passwordStatus.can_change_own ? "Sim" : "Não"}
                      </Badge>
                    </div>

                    {!passwordStatus.can_change_own && (
                      <div className="col-span-full">
                        <Alert className="border-amber-200 bg-amber-50">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-700">
                            <strong>Restrição de Administrador:</strong>
                            <br />
                            {passwordStatus.change_restriction_message}
                            {getDaysUntilNextChange() && (
                              <span className="block mt-1">
                                Próxima alteração permitida em {getDaysUntilNextChange()} dias.
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </>
                )}

                {/* Senha alterada pelo admin */}
                {passwordStatus.changed_by_admin && (
                  <div className="col-span-full">
                    <Alert className="border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-700">
                        <strong>Atenção:</strong> Sua senha foi alterada pelo administrador. É recomendado criar uma
                        nova senha personalizada.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário de Alteração */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Alterar Senha</CardTitle>
            <CardDescription>
              {passwordStatus?.must_change
                ? "Você deve alterar sua senha para continuar usando o sistema"
                : "Crie uma nova senha segura para sua conta"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleTrocarSenha} className="space-y-6">
              {/* Mensagens */}
              {erro && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">{erro}</AlertDescription>
                </Alert>
              )}

              {sucesso && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">{sucesso}</AlertDescription>
                </Alert>
              )}

              {/* Senha Atual */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Senha Atual *</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Digite sua senha atual"
                    required
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    disabled={loading}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Nova Senha */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Key className="h-4 w-4" />
                  <span>Nova Senha *</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Digite sua nova senha"
                    required
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={loading}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Critérios de Senha */}
              {novaSenha && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Critérios de segurança:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className={`flex items-center space-x-2 text-xs ${
                        passwordValidation.minLength ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      <CheckCircle className="h-3 w-3" />
                      <span>Mínimo 6 caracteres</span>
                    </div>
                    <div
                      className={`flex items-center space-x-2 text-xs ${
                        passwordValidation.hasUpper ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      <CheckCircle className="h-3 w-3" />
                      <span>Letra maiúscula</span>
                    </div>
                    <div
                      className={`flex items-center space-x-2 text-xs ${
                        passwordValidation.hasLower ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      <CheckCircle className="h-3 w-3" />
                      <span>Letra minúscula</span>
                    </div>
                    <div
                      className={`flex items-center space-x-2 text-xs ${
                        passwordValidation.hasNumber ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      <CheckCircle className="h-3 w-3" />
                      <span>Pelo menos um número</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Confirme a Nova Senha *</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmation ? "text" : "password"}
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    required
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmation(!showConfirmation)}
                    disabled={loading}
                  >
                    {showConfirmation ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {confirmacao && novaSenha !== confirmacao && (
                  <p className="text-xs text-red-600">As senhas não coincidem</p>
                )}
              </div>

              {/* Botões */}
              <div className="flex space-x-3 pt-4">
                {!passwordStatus?.must_change && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => navigate("/dashboard")}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  className={`${passwordStatus?.must_change ? "w-full" : "flex-1"}`}
                  disabled={
                    loading ||
                    !passwordValidation.isValid ||
                    novaSenha !== confirmacao ||
                    !senhaAtual ||
                    (passwordStatus && !passwordStatus.can_change_own)
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TrocarSenha
