"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import axios from "../services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  User,
  Mail,
  Building,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Key,
  Save,
  X,
} from "lucide-react"

const Usuario = () => {
  const { user: currentUser, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" })

  // Estados para modal de criação/edição
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "usuario_padrao",
    obra_id: "",
    ativo: true,
  })
  const [formErrors, setFormErrors] = useState({})

  // Estados para modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Estados para modal de alteração de senha
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordUser, setPasswordUser] = useState(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (isAdmin()) {
      carregarDados()
    }
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [usersResponse, obrasResponse] = await Promise.all([axios.get("/auth/users"), axios.get("/obras/")])

      setUsers(usersResponse.data.users || [])
      setObras(obrasResponse.data.obras || [])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      setMensagem({ tipo: "error", texto: "Erro ao carregar dados dos usuários." })
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    const requiredFields = ["username", "email"]

    // Adicionar senha como obrigatória apenas para novos usuários
    if (!editingUser) {
      requiredFields.push("password")
    }

    // Verificar campos obrigatórios
    requiredFields.forEach((field) => {
      const value = formData[field]
      if (!value || (typeof value === "string" && !value.trim())) {
        errors[field] =
          `${field === "username" ? "Nome de usuário" : field === "email" ? "Email" : "Senha"} é obrigatório`
      }
    })

    // Validar email
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = "Email inválido"
      }
    }

    // Validar senha (apenas para novos usuários ou se senha foi preenchida)
    if (formData.password && formData.password.trim()) {
      if (formData.password.length < 8) {
        errors.password = "Senha deve ter pelo menos 8 caracteres"
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = "Senha deve conter pelo menos: 1 maiúscula, 1 minúscula e 1 número"
      }
    }

    // Validar obra para usuário padrão
    if (formData.role === "usuario_padrao" && !formData.obra_id) {
      errors.obra_id = "Obra é obrigatória para usuário padrão"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const isFormValid = () => {
    const requiredFields = ["username", "email"]
    if (!editingUser) {
      requiredFields.push("password")
    }

    const hasRequiredFields = requiredFields.every((field) => {
      const value = formData[field]
      return value && (typeof value === "string" ? value.trim() : true)
    })

    const hasNoErrors = Object.keys(formErrors).length === 0
    return hasRequiredFields && hasNoErrors
  }

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })

    // Limpar erro do campo quando usuário começar a digitar
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: "" })
    }

    // Validar em tempo real
    setTimeout(() => validateForm(), 100)
  }

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "usuario_padrao",
      obra_id: "",
      ativo: true,
    })
    setFormErrors({})
    setEditingUser(null)
  }

  const handleCreateUser = () => {
    resetForm()
    setShowUserModal(true)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username || "",
      email: user.email || "",
      password: "",
      role: user.role || "usuario_padrao",
      obra_id: user.obra_id || "",
      ativo: user.ativo !== false,
    })
    setFormErrors({})
    setShowUserModal(true)
  }

  const handleSaveUser = async () => {
    if (!validateForm()) return

    setSaving(true)
    setMensagem({ tipo: "", texto: "" })

    try {
      const userData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        role: formData.role,
        obra_id: formData.role === "usuario_padrao" ? formData.obra_id : null,
        ativo: formData.ativo,
      }

      // Adicionar senha apenas se preenchida
      if (formData.password && formData.password.trim()) {
        userData.password = formData.password
      }

      if (editingUser) {
        // Editar usuário existente
        await axios.put(`/auth/users/${editingUser.id}`, userData)
        setMensagem({ tipo: "success", texto: "Usuário atualizado com sucesso!" })
      } else {
        // Criar novo usuário
        await axios.post("/auth/register", userData)
        setMensagem({ tipo: "success", texto: "Usuário criado com sucesso!" })
      }

      setShowUserModal(false)
      resetForm()
      await carregarDados()
    } catch (error) {
      console.error("Erro ao salvar usuário:", error)
      const errorMessage = error.response?.data?.message || "Erro ao salvar usuário."
      setMensagem({ tipo: "error", texto: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = (user) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    setDeleting(true)

    try {
      await axios.delete(`/auth/users/${userToDelete.id}`)
      setMensagem({ tipo: "success", texto: "Usuário excluído com sucesso!" })
      setShowDeleteModal(false)
      setUserToDelete(null)
      await carregarDados()
    } catch (error) {
      console.error("Erro ao excluir usuário:", error)
      const errorMessage = error.response?.data?.message || "Erro ao excluir usuário."
      setMensagem({ tipo: "error", texto: errorMessage })
    } finally {
      setDeleting(false)
    }
  }

  const handleChangePassword = (user) => {
    setPasswordUser(user)
    setNewPassword("")
    setConfirmPassword("")
    setShowPasswordModal(true)
  }

  const validatePassword = () => {
    if (!newPassword.trim()) return false
    if (newPassword.length < 8) return false
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) return false
    if (newPassword !== confirmPassword) return false
    return true
  }

  const confirmChangePassword = async () => {
    if (!validatePassword()) {
      setMensagem({ tipo: "error", texto: "Senha inválida ou senhas não coincidem." })
      return
    }

    setChangingPassword(true)

    try {
      await axios.post("/auth/admin/change-user-password", {
        user_id: passwordUser.id,
        new_password: newPassword,
      })

      setMensagem({
        tipo: "success",
        texto: `Senha do usuário ${passwordUser.username} alterada com sucesso!`,
      })

      setShowPasswordModal(false)
      setPasswordUser(null)
      setNewPassword("")
      setConfirmPassword("")
      await carregarDados()
    } catch (error) {
      console.error("Erro ao alterar senha:", error)
      const errorMessage = error.response?.data?.message || "Erro ao alterar senha."
      setMensagem({ tipo: "error", texto: errorMessage })
    } finally {
      setChangingPassword(false)
    }
  }

  const getObraNome = (obraId) => {
    const obra = obras.find((o) => o.id === obraId)
    return obra ? obra.nome : `Obra ${obraId}`
  }

  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
        <p className="text-gray-600">Apenas administradores podem gerenciar usuários.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Carregando usuários...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h2>
          <p className="text-gray-600">Gerencie usuários do sistema e suas permissões</p>
        </div>
        <Button onClick={handleCreateUser}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
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

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Lista de Usuários
          </CardTitle>
          <CardDescription>
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {user.role === "administrador" ? (
                            <Shield className="h-5 w-5 text-blue-600" />
                          ) : (
                            <User className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">ID: {user.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "administrador" ? "default" : "secondary"}>
                        {user.role === "administrador" ? (
                          <>
                            <Shield className="mr-1 h-3 w-3" />
                            Administrador
                          </>
                        ) : (
                          <>
                            <User className="mr-1 h-3 w-3" />
                            Usuário Padrão
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.obra_id ? (
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{getObraNome(user.obra_id)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.ativo ? "secondary" : "destructive"}>
                        {user.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChangePassword(user)}
                          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.id !== currentUser?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum usuário encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição de Usuário */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingUser ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Edite as informações do usuário abaixo"
                : "Preencha as informações para criar um novo usuário"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nome de Usuário */}
            <div className="space-y-2">
              <Label htmlFor="username">
                Nome de Usuário <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Digite o nome de usuário"
                className={formErrors.username ? "border-red-500" : ""}
                disabled={saving}
              />
              {formErrors.username && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {formErrors.username}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Digite o email"
                className={formErrors.email ? "border-red-500" : ""}
                disabled={saving}
              />
              {formErrors.email && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Senha {!editingUser && <span className="text-red-500">*</span>}
                {editingUser && <span className="text-gray-500 text-xs">(deixe em branco para manter atual)</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder={editingUser ? "Nova senha (opcional)" : "Digite a senha"}
                className={formErrors.password ? "border-red-500" : ""}
                disabled={saving}
              />
              <p className="text-xs text-gray-500">
                Mínimo 8 caracteres com pelo menos: 1 maiúscula, 1 minúscula e 1 número
              </p>
              {formErrors.password && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {formErrors.password}
                </p>
              )}
            </div>

            {/* Tipo de Usuário */}
            <div className="space-y-2">
              <Label>Tipo de Usuário</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange("role", value)}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario_padrao">
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Usuário Padrão
                    </div>
                  </SelectItem>
                  <SelectItem value="administrador">
                    <div className="flex items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      Administrador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Obra (apenas para usuário padrão) */}
            {formData.role === "usuario_padrao" && (
              <div className="space-y-2">
                <Label>
                  Obra <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.obra_id}
                  onValueChange={(value) => handleInputChange("obra_id", value)}
                  disabled={saving}
                >
                  <SelectTrigger className={formErrors.obra_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecione uma obra" />
                  </SelectTrigger>
                  <SelectContent>
                    {obras.map((obra) => (
                      <SelectItem key={obra.id} value={obra.id.toString()}>
                        <div className="flex items-center">
                          <Building className="mr-2 h-4 w-4" />
                          {obra.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.obra_id && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {formErrors.obra_id}
                  </p>
                )}
              </div>
            )}

            {/* Status Ativo */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Usuário Ativo</Label>
                <div className="text-sm text-muted-foreground">Usuários inativos não podem fazer login no sistema</div>
              </div>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => handleInputChange("ativo", checked)}
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUserModal(false)}
              disabled={saving}
              className="bg-transparent"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={!isFormValid() || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingUser ? "Atualizar" : "Criar"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O usuário será permanentemente removido do sistema.
            </DialogDescription>
          </DialogHeader>

          {userToDelete && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {userToDelete.role === "administrador" ? (
                    <Shield className="h-6 w-6 text-red-600" />
                  ) : (
                    <User className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-red-900">{userToDelete.username}</p>
                  <p className="text-sm text-red-700">{userToDelete.email}</p>
                  <Badge variant="outline" className="mt-1 border-red-300 text-red-700">
                    {userToDelete.role === "administrador" ? "Administrador" : "Usuário Padrão"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              <strong>Atenção:</strong> Todos os dados associados a este usuário serão perdidos. Esta ação é
              irreversível.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="bg-transparent"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteUser} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Usuário
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Alteração de Senha */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Alterar Senha do Usuário
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para o usuário. Ele será obrigado a alterá-la no próximo login.
            </DialogDescription>
          </DialogHeader>

          {passwordUser && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">{passwordUser.username}</p>
                  <p className="text-sm text-blue-700">{passwordUser.email}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="new-password">
                Nova Senha <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  disabled={changingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={changingPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                Confirmar Nova Senha <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                  disabled={changingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={changingPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600">As senhas não coincidem</p>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Mínimo 8 caracteres com pelo menos: 1 maiúscula, 1 minúscula e 1 número
            </p>

            {/* Aviso */}
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <strong>Importante:</strong> O usuário será obrigado a criar uma nova senha no próximo login por
                segurança.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(false)}
              disabled={changingPassword}
              className="bg-transparent"
            >
              Cancelar
            </Button>
            <Button onClick={confirmChangePassword} disabled={!validatePassword() || changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Alterar Senha
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Usuario
