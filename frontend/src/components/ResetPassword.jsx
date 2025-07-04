import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, Eye, EyeOff, Shield, Clock, AlertTriangle } from "lucide-react"
import api from "../services/api"

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenData, setTokenData] = useState(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  // Validar token ao carregar o componente
  useEffect(() => {
    if (!token) {
      setError("Token de reset não fornecido")
      setValidatingToken(false)
      return
    }

    validateToken()
  }, [token])

  // Calcular força da senha
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(formData.password))
  }, [formData.password])

  const validateToken = async () => {
    try {
      setValidatingToken(true)
      const response = await api.get(`/validate-reset-token/${token}`)

      if (response.data.valid) {
        setTokenValid(true)
        setTokenData(response.data)
      } else {
        setError(response.data.error || "Token inválido ou expirado")
      }
    } catch (error) {
      console.error("Erro ao validar token:", error)
      setError(error.response?.data?.error || "Erro ao validar token")
    } finally {
      setValidatingToken(false)
    }
  }

  const calculatePasswordStrength = (password) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[a-z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 25
    return strength
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return "bg-red-500"
    if (passwordStrength < 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return "Muito fraca"
    if (passwordStrength < 50) return "Fraca"
    if (passwordStrength < 75) return "Média"
    return "Forte"
  }

  const validateForm = () => {
    if (!formData.password) {
      setError("Nova senha é obrigatória")
      return false
    }

    if (formData.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres")
      return false
    }

    if (!/[A-Z]/.test(formData.password)) {
      setError("A senha deve conter pelo menos uma letra maiúscula")
      return false
    }

    if (!/[a-z]/.test(formData.password)) {
      setError("A senha deve conter pelo menos uma letra minúscula")
      return false
    }

    if (!/[0-9]/.test(formData.password)) {
      setError("A senha deve conter pelo menos um número")
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem")
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (!validateForm()) return

    try {
      setLoading(true)

      const response = await api.post("/reset-password", {
        token,
        password: formData.password,
      })

      if (response.data.success) {
        setSuccess(true)
        setMessage(response.data.message)

        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate("/login", {
            state: {
              message: "Senha redefinida com sucesso! Faça login com sua nova senha.",
            },
          })
        }, 3000)
      }
    } catch (error) {
      console.error("Erro ao redefinir senha:", error)
      setError(error.response?.data?.error || "Erro ao redefinir senha")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError("")
  }

  // Tela de carregamento da validação do token
  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Validando token de reset...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela de token inválido
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Token Inválido</CardTitle>
            <CardDescription>{error || "O link de reset de senha é inválido ou expirou."}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Solicite um novo link de reset de senha na página de login.</AlertDescription>
              </Alert>
              <Button onClick={() => navigate("/login")} className="w-full">
                Voltar ao Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela de sucesso
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Senha Redefinida!</CardTitle>
            <CardDescription>Sua senha foi alterada com sucesso.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <p className="text-sm text-gray-600 text-center">Redirecionando para o login em alguns segundos...</p>
              <Button onClick={() => navigate("/login")} className="w-full">
                Ir para Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Formulário de reset de senha
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Redefinir Senha</CardTitle>
          <CardDescription>Crie uma nova senha para sua conta</CardDescription>
        </CardHeader>

        <CardContent>
          {tokenData && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <Clock className="w-4 h-4" />
                <span>Usuário: {tokenData.username}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-700 mt-1">
                <Clock className="w-4 h-4" />
                <span>Token expira em: {new Date(tokenData.expires_at).toLocaleString("pt-BR")}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Digite sua nova senha"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>

              {formData.password && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Força da senha:</span>
                    <span
                      className={`font-medium ${
                        passwordStrength < 50
                          ? "text-red-600"
                          : passwordStrength < 75
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <Progress value={passwordStrength} className="h-2" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirme sua nova senha"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Critérios da senha:</h4>
              <ul className="text-sm space-y-1">
                <li
                  className={`flex items-center space-x-2 ${
                    formData.password.length >= 8 ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Pelo menos 8 caracteres</span>
                </li>
                <li
                  className={`flex items-center space-x-2 ${
                    /[A-Z]/.test(formData.password) ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Uma letra maiúscula</span>
                </li>
                <li
                  className={`flex items-center space-x-2 ${
                    /[a-z]/.test(formData.password) ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Uma letra minúscula</span>
                </li>
                <li
                  className={`flex items-center space-x-2 ${
                    /[0-9]/.test(formData.password) ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Um número</span>
                </li>
              </ul>
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading || passwordStrength < 100}>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Redefinindo...</span>
                </div>
              ) : (
                "Redefinir Senha"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => navigate("/login")}
            >
              Voltar ao Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPassword
