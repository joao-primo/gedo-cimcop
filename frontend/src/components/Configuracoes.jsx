import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { configuracoesAPI, authAPI } from "../services/api" // ← ÚNICA ADIÇÃO
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Save,
  RefreshCw,
  Database,
  Bell,
  Shield,
  Server,
  Users,
  AlertTriangle,
  CheckCircle,
  Info,
  Trash2,
  Key,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react"

const Configuracoes = () => {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Estados para configurações gerais
  const [configuracoes, setConfiguracoes] = useState({
    nome_sistema: "GEDO CIMCOP",
    versao: "1.0.0",
    descricao: "Sistema de Gestão de Documentos",
    empresa: "CIMCOP",
    contato_suporte: "suporte@cimcop.com.br",
    timezone: "America/Sao_Paulo",
    idioma: "pt-BR",
    tema: "claro",
  })

  // Estados para configurações de sistema (admin)
  const [configSistema, setConfigSistema] = useState({
    max_upload_size: "10",
    backup_automatico: true,
    backup_frequencia: "diario",
    log_nivel: "info",
    manutencao_modo: false,
    cache_habilitado: true,
    debug_modo: false,
  })

  // Estados para notificações
  const [configNotificacoes, setConfigNotificacoes] = useState({
    email_habilitado: true,
    notif_novos_registros: true,
    notif_alteracoes: true,
    notif_backup: true,
    notif_erros: true,
    smtp_servidor: "smtp.gmail.com",
    smtp_porta: "587",
    smtp_usuario: "",
    smtp_senha: "",
    smtp_ssl: true,
  })

  // Estados para segurança (admin)
  const [configSeguranca, setConfigSeguranca] = useState({
    sessao_timeout: "60",
    tentativas_login: "5",
    bloqueio_tempo: "15",
    senha_complexidade: true,
    dois_fatores: false,
    log_auditoria: true,
    ip_whitelist: "",
  })

  // Estados para troca de senha do usuário
  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true)
      const response = await configuracoesAPI.get() // ← CORREÇÃO

      if (response.data.configuracoes) {
        setConfiguracoes({ ...configuracoes, ...response.data.configuracoes })
      }
      if (response.data.sistema && isAdmin()) {
        setConfigSistema({ ...configSistema, ...response.data.sistema })
      }
      if (response.data.notificacoes) {
        setConfigNotificacoes({ ...configNotificacoes, ...response.data.notificacoes })
      }
      if (response.data.seguranca && isAdmin()) {
        setConfigSeguranca({ ...configSeguranca, ...response.data.seguranca })
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error)
      showMessage("Erro ao carregar configurações", "error")
    } finally {
      setLoading(false)
    }
  }

  const salvarConfiguracoes = async () => {
    try {
      setLoading(true)

      const payload = {
        configuracoes,
        ...(isAdmin() && { sistema: configSistema }),
        notificacoes: configNotificacoes,
        ...(isAdmin() && { seguranca: configSeguranca }),
      }

      await configuracoesAPI.save(payload) // ← CORREÇÃO
      showMessage("Configurações salvas com sucesso!", "success")
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
      showMessage(error.response?.data?.message || "Erro ao salvar configurações", "error")
    } finally {
      setLoading(false)
    }
  }

  const trocarSenha = async () => {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      showMessage("Preencha todos os campos de senha", "error")
      return
    }

    if (novaSenha !== confirmarSenha) {
      showMessage("As senhas não coincidem", "error")
      return
    }

    if (novaSenha.length < 6) {
      showMessage("A nova senha deve ter pelo menos 6 caracteres", "error")
      return
    }

    try {
      setLoading(true)

      await authAPI.changePassword({
        // ← CORREÇÃO
        current_password: senhaAtual,
        new_password: novaSenha,
      })

      showMessage("Senha alterada com sucesso!", "success")
      setSenhaAtual("")
      setNovaSenha("")
      setConfirmarSenha("")
    } catch (error) {
      console.error("Erro ao alterar senha:", error)
      showMessage(error.response?.data?.message || "Erro ao alterar senha", "error")
    } finally {
      setLoading(false)
    }
  }

  const realizarBackup = async () => {
    try {
      setLoading(true)
      await configuracoesAPI.backup() // ← CORREÇÃO
      showMessage("Backup realizado com sucesso!", "success")
    } catch (error) {
      console.error("Erro ao realizar backup:", error)
      showMessage(error.response?.data?.message || "Erro ao realizar backup", "error")
    } finally {
      setLoading(false)
    }
  }

  const resetarConfiguracoes = async () => {
    if (!confirm("Tem certeza que deseja resetar todas as configurações? Esta ação não pode ser desfeita.")) {
      return
    }

    try {
      setLoading(true)
      await configuracoesAPI.reset() // ← CORREÇÃO
      showMessage("Configurações resetadas com sucesso!", "success")
      await carregarConfiguracoes()
    } catch (error) {
      console.error("Erro ao resetar configurações:", error)
      showMessage(error.response?.data?.message || "Erro ao resetar configurações", "error")
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (msg, type) => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => {
      setMessage("")
      setMessageType("")
    }, 5000)
  }

  // Interface simplificada para usuário comum
  if (!isAdmin()) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-600 mt-1">Gerencie suas preferências pessoais</p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuário
          </Badge>
        </div>

        {message && (
          <Alert className={messageType === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
            {messageType === "error" ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={messageType === "error" ? "text-red-700" : "text-green-700"}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {/* Informações do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Informações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sistema</Label>
                  <p className="text-lg font-semibold">{configuracoes.nome_sistema}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Versão</Label>
                  <p className="text-lg font-semibold">{configuracoes.versao}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Empresa</Label>
                  <p className="text-lg font-semibold">{configuracoes.empresa}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Suporte</Label>
                  <p className="text-lg font-semibold">{configuracoes.contato_suporte}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alterar Senha */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>Altere sua senha de acesso ao sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Senha Atual</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Digite sua senha atual"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Digite sua nova senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirmar Nova Senha</Label>
                <Input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirme sua nova senha"
                />
              </div>

              <Button onClick={trocarSenha} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Interface completa para administrador
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
          <p className="text-gray-600 mt-1">Gerencie todas as configurações do sistema</p>
        </div>
        <Badge variant="destructive" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Administrador
        </Badge>
      </div>

      {message && (
        <Alert className={messageType === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          {messageType === "error" ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={messageType === "error" ? "text-red-700" : "text-green-700"}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* Aba Geral */}
        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Configurações básicas do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações do Sistema - Somente Leitura */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Informações do Sistema</h3>
                </div>
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    As informações do sistema são gerenciadas pelo administrador principal e não podem ser alteradas aqui.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Nome do Sistema</Label>
                    <Input
                      value={configuracoes.nome_sistema}
                      disabled
                      className="bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Versão</Label>
                    <Input
                      value={configuracoes.versao}
                      disabled
                      className="bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Empresa</Label>
                    <Input
                      value={configuracoes.empresa}
                      disabled
                      className="bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Contato de Suporte</Label>
                    <Input
                      value={configuracoes.contato_suporte}
                      disabled
                      className="bg-gray-50 text-gray-700"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Configurações Editáveis */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Configurações Editáveis</h3>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={configuracoes.descricao}
                    onChange={(e) => setConfiguracoes({ ...configuracoes, descricao: e.target.value })}
                    rows={3}
                    placeholder="Descrição do sistema..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fuso Horário</Label>
                    <Select
                      value={configuracoes.timezone}
                      onValueChange={(value) => setConfiguracoes({ ...configuracoes, timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                        <SelectItem value="America/Rio_Branco">Rio Branco (GMT-5)</SelectItem>
                        <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select
                      value={configuracoes.idioma}
                      onValueChange={(value) => setConfiguracoes({ ...configuracoes, idioma: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Sistema */}
        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>Configurações técnicas e de performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tamanho Máximo de Upload (MB)</Label>
                  <Input
                    type="number"
                    value={configSistema.max_upload_size}
                    onChange={(e) => setConfigSistema({ ...configSistema, max_upload_size: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nível de Log</Label>
                  <Select
                    value={configSistema.log_nivel}
                    onValueChange={(value) => setConfigSistema({ ...configSistema, log_nivel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Backup Automático</Label>
                    <p className="text-sm text-gray-500">Realizar backup automático do sistema</p>
                  </div>
                  <Switch
                    checked={configSistema.backup_automatico}
                    onCheckedChange={(checked) => setConfigSistema({ ...configSistema, backup_automatico: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cache Habilitado</Label>
                    <p className="text-sm text-gray-500">Usar cache para melhorar performance</p>
                  </div>
                  <Switch
                    checked={configSistema.cache_habilitado}
                    onCheckedChange={(checked) => setConfigSistema({ ...configSistema, cache_habilitado: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo de Manutenção</Label>
                    <p className="text-sm text-gray-500">Bloquear acesso para manutenção</p>
                  </div>
                  <Switch
                    checked={configSistema.manutencao_modo}
                    onCheckedChange={(checked) => setConfigSistema({ ...configSistema, manutencao_modo: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo Debug</Label>
                    <p className="text-sm text-gray-500">Ativar logs detalhados (apenas desenvolvimento)</p>
                  </div>
                  <Switch
                    checked={configSistema.debug_modo}
                    onCheckedChange={(checked) => setConfigSistema({ ...configSistema, debug_modo: checked })}
                  />
                </div>
              </div>

              {configSistema.backup_automatico && (
                <div className="space-y-2">
                  <Label>Frequência do Backup</Label>
                  <Select
                    value={configSistema.backup_frequencia}
                    onValueChange={(value) => setConfigSistema({ ...configSistema, backup_frequencia: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Notificações */}
        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
              <CardDescription>Configure como e quando receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Habilitado</Label>
                    <p className="text-sm text-gray-500">Permitir envio de emails</p>
                  </div>
                  <Switch
                    checked={configNotificacoes.email_habilitado}
                    onCheckedChange={(checked) =>
                      setConfigNotificacoes({ ...configNotificacoes, email_habilitado: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Novos Registros</Label>
                    <p className="text-sm text-gray-500">Notificar sobre novos registros</p>
                  </div>
                  <Switch
                    checked={configNotificacoes.notif_novos_registros}
                    onCheckedChange={(checked) =>
                      setConfigNotificacoes({ ...configNotificacoes, notif_novos_registros: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alterações</Label>
                    <p className="text-sm text-gray-500">Notificar sobre alterações importantes</p>
                  </div>
                  <Switch
                    checked={configNotificacoes.notif_alteracoes}
                    onCheckedChange={(checked) =>
                      setConfigNotificacoes({ ...configNotificacoes, notif_alteracoes: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Backup</Label>
                    <p className="text-sm text-gray-500">Notificar sobre status do backup</p>
                  </div>
                  <Switch
                    checked={configNotificacoes.notif_backup}
                    onCheckedChange={(checked) =>
                      setConfigNotificacoes({ ...configNotificacoes, notif_backup: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Erros</Label>
                    <p className="text-sm text-gray-500">Notificar sobre erros do sistema</p>
                  </div>
                  <Switch
                    checked={configNotificacoes.notif_erros}
                    onCheckedChange={(checked) =>
                      setConfigNotificacoes({ ...configNotificacoes, notif_erros: checked })
                    }
                  />
                </div>
              </div>

              {configNotificacoes.email_habilitado && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Configurações SMTP</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Servidor SMTP</Label>
                        <Input
                          value={configNotificacoes.smtp_servidor}
                          onChange={(e) =>
                            setConfigNotificacoes({ ...configNotificacoes, smtp_servidor: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Porta</Label>
                        <Input
                          value={configNotificacoes.smtp_porta}
                          onChange={(e) => setConfigNotificacoes({ ...configNotificacoes, smtp_porta: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Usuário</Label>
                        <Input
                          value={configNotificacoes.smtp_usuario}
                          onChange={(e) =>
                            setConfigNotificacoes({ ...configNotificacoes, smtp_usuario: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Senha</Label>
                        <Input
                          type="password"
                          value={configNotificacoes.smtp_senha}
                          onChange={(e) => setConfigNotificacoes({ ...configNotificacoes, smtp_senha: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SSL/TLS</Label>
                        <p className="text-sm text-gray-500">Usar conexão segura</p>
                      </div>
                      <Switch
                        checked={configNotificacoes.smtp_ssl}
                        onCheckedChange={(checked) =>
                          setConfigNotificacoes({ ...configNotificacoes, smtp_ssl: checked })
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Segurança */}
        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
              <CardDescription>Configure políticas de segurança do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timeout de Sessão (minutos)</Label>
                  <Input
                    type="number"
                    value={configSeguranca.sessao_timeout}
                    onChange={(e) => setConfigSeguranca({ ...configSeguranca, sessao_timeout: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tentativas de Login</Label>
                  <Input
                    type="number"
                    value={configSeguranca.tentativas_login}
                    onChange={(e) => setConfigSeguranca({ ...configSeguranca, tentativas_login: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tempo de Bloqueio (minutos)</Label>
                  <Input
                    type="number"
                    value={configSeguranca.bloqueio_tempo}
                    onChange={(e) => setConfigSeguranca({ ...configSeguranca, bloqueio_tempo: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Complexidade de Senha</Label>
                    <p className="text-sm text-gray-500">Exigir senhas complexas</p>
                  </div>
                  <Switch
                    checked={configSeguranca.senha_complexidade}
                    onCheckedChange={(checked) =>
                      setConfigSeguranca({ ...configSeguranca, senha_complexidade: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autenticação de Dois Fatores</Label>
                    <p className="text-sm text-gray-500">Exigir 2FA para administradores</p>
                  </div>
                  <Switch
                    checked={configSeguranca.dois_fatores}
                    onCheckedChange={(checked) => setConfigSeguranca({ ...configSeguranca, dois_fatores: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Log de Auditoria</Label>
                    <p className="text-sm text-gray-500">Registrar todas as ações dos usuários</p>
                  </div>
                  <Switch
                    checked={configSeguranca.log_auditoria}
                    onCheckedChange={(checked) => setConfigSeguranca({ ...configSeguranca, log_auditoria: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Whitelist de IPs</Label>
                <Textarea
                  value={configSeguranca.ip_whitelist}
                  onChange={(e) => setConfigSeguranca({ ...configSeguranca, ip_whitelist: e.target.value })}
                  placeholder="Digite os IPs permitidos, um por linha"
                  rows={4}
                />
                <p className="text-sm text-gray-500">
                  Deixe em branco para permitir todos os IPs. Use um IP por linha.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Botões de Ação */}
        <div className="flex justify-between">
          <div className="flex space-x-3">
            <Button onClick={realizarBackup} variant="outline" disabled={loading}>
              <Database className="mr-2 h-4 w-4" />
              Fazer Backup
            </Button>
            <Button onClick={resetarConfiguracoes} variant="outline" disabled={loading}>
              <Trash2 className="mr-2 h-4 w-4" />
              Resetar
            </Button>
          </div>
          <Button onClick={salvarConfiguracoes} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </Tabs>
    </div>
  )
}

export default Configuracoes
