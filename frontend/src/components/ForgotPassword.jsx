import { useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react"
import api from "../services/api"

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (!email.trim()) {
      setError("Email é obrigatório")
      return
    }

    if (!validateEmail(email)) {
      setError("Por favor, insira um email válido")
      return
    }

    try {
      setLoading(true)

      const response = await api.post("/forgot-password", {
        email: email.trim().toLowerCase(),
      })

      if (response.data.success) {
        setSuccess(true)
        setMessage(response.data.message)
      }
    } catch (error) {
      console.error("Erro ao solicitar reset:", error)

      if (error.response?.status === 429) {
        setError("Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.")
      } else {
        setError(error.response?.data?.error || "Erro ao enviar solicitação. Tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Email Enviado!</CardTitle>
            <CardDescription>Verifique sua caixa de entrada</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2 text-blue-800">Próximos passos:</h4>
              <ol className="text-sm space-y-1 text-blue-700 list-decimal list-inside">
                <li>Verifique sua caixa de entrada (e spam)</li>
                <li>Clique no link do email</li>
                <li>Crie sua nova senha</li>
                <li>Faça login com a nova senha</li>
              </ol>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800">
                <Clock className="w-4 h-4" />
                <span className="font-medium text-sm">Importante:</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                O link de reset é válido por apenas 1 hora por motivos de segurança.
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => {
                  setSuccess(false)
                  setEmail("")
                  setMessage("")
                }}
              >
                Enviar Novamente
              </Button>
              <Link to="/login" className="flex-1">
                <Button className="w-full">Ir para Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Esqueceu sua senha?</CardTitle>
          <CardDescription>Digite seu email para receber instruções de reset</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Enviando...</span>
                </div>
              ) : (
                "Enviar Link de Reset"
              )}
            </Button>

            <Link to="/login">
              <Button variant="outline" className="w-full bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Login
              </Button>
            </Link>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Como funciona:</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Enviamos um link seguro para seu email</li>
              <li>• O link é válido por 1 hora</li>
              <li>• Você cria uma nova senha</li>
              <li>• Sua conta fica protegida</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPassword
