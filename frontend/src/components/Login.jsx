"use client"

import { useState, useContext, useEffect } from "react"
import { AuthContext } from "../contexts/AuthContext"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Alert, AlertDescription } from "./ui/alert"
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { testConnection } from "../services/api"

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("checking") // checking, connected, error
  const { login, loading, error } = useContext(AuthContext)

  // Testar conectividade ao carregar o componente
  useEffect(() => {
    const checkConnection = async () => {
      console.log("🔍 Verificando conectividade com o backend...")
      try {
        const isConnected = await testConnection()
        setConnectionStatus(isConnected ? "connected" : "error")
      } catch (error) {
        console.error("❌ Erro ao testar conectividade:", error)
        setConnectionStatus("error")
      }
    }

    checkConnection()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Verificar conectividade antes de tentar login
    if (connectionStatus !== "connected") {
      console.log("⚠️ Tentando reconectar antes do login...")
      const isConnected = await testConnection()
      setConnectionStatus(isConnected ? "connected" : "error")

      if (!isConnected) {
        return // Não prosseguir se não conseguir conectar
      }
    }

    await login(email, password)
  }

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case "checking":
        return (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-800">Verificando conectividade com o servidor...</AlertDescription>
          </Alert>
        )
      case "connected":
        return (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">Conectado ao servidor com sucesso</AlertDescription>
          </Alert>
        )
      case "error":
        return (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Não foi possível conectar ao servidor. Verifique sua conexão com a internet.
            </AlertDescription>
          </Alert>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">GEDO CIMCOP</CardTitle>
          <CardDescription className="text-gray-600">
            Sistema de Gerenciamento de Documentos e Registros de Obras
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status de Conectividade */}
          {getConnectionStatusDisplay()}

          {/* Erro de Login */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                disabled={loading || connectionStatus === "checking"}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10"
                  disabled={loading || connectionStatus === "checking"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || connectionStatus === "checking"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading || connectionStatus !== "connected"}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              onClick={() => {
                // Implementar esqueci minha senha
                alert("Funcionalidade em desenvolvimento")
              }}
            >
              Esqueci minha senha
            </button>
          </div>

          {/* Informações de Debug em Desenvolvimento */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs text-gray-600">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>API URL: {import.meta.env.VITE_API_URL}</p>
              <p>Status: {connectionStatus}</p>
              <p>Credenciais padrão:</p>
              <p>Email: admin@gedo.com</p>
              <p>Senha: admin123</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
