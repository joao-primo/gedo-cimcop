"use client"

import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Alert, AlertDescription } from "./ui/alert"
import { Eye, EyeOff, AlertCircle, CheckCircle, Info } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [warning, setWarning] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    // Verificar mensagens da URL
    const message = searchParams.get("message")
    const type = searchParams.get("type")

    if (message && type) {
      if (type === "success") {
        setSuccess(message)
      } else if (type === "error") {
        setError(message)
      } else if (type === "warning") {
        setWarning(message)
      }

      // Limpar URL após 3 segundos
      setTimeout(() => {
        setSuccess("")
        setError("")
        setWarning("")
      }, 3000)
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setWarning("")

    if (!email || !password) {
      setError("Por favor, preencha todos os campos")
      return
    }

    setLoading(true)

    try {
      const result = await login(email, password)

      if (result.success) {
        setSuccess(result.message || "Login realizado com sucesso!")

        if (result.warning) {
          setWarning(result.warning)
        }

        // Redirecionar após um breve delay
        setTimeout(() => {
          navigate(result.redirectTo || "/dashboard")
        }, 1000)
      } else {
        setError(result.message)
      }
    } catch (error) {
      console.error("Erro no login:", error)
      setError("Erro interno do servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">GEDO CIMCOP</h1>
          <p className="text-gray-600">Sistema de Gestão de Obras</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Fazer Login</CardTitle>
            <CardDescription className="text-center">Entre com suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mensagens de Feedback */}
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {warning && (
              <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">{warning}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="link"
                  className="px-0 font-normal text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => navigate("/esqueci-senha")}
                >
                  Esqueceu sua senha?
                </Button>
              </div>

              <Button type="submit" className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white" disabled={loading}>
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Entrando...
                  </div>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Sistema de Gestão de Obras</p>
          <p>Versão 1.0</p>
        </div>
      </div>
    </div>
  )
}
