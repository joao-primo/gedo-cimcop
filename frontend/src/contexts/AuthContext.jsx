"use client"

import { createContext, useContext, useState, useEffect } from "react"
import axios from "../services/api"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token")
      if (token) {
        // Configurar o token no axios
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`

        // Verificar se o token é válido
        const response = await axios.get("/auth/me")
        setUser(response.data.user)
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error)
      // Se o token for inválido, remover do localStorage
      localStorage.removeItem("token")
      delete axios.defaults.headers.common["Authorization"]
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await axios.post("/auth/login", {
        email,
        password,
      })

      const { token, user: userData } = response.data

      // Salvar token no localStorage
      localStorage.setItem("token", token)

      // Configurar token no axios
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`

      // Atualizar estado do usuário
      setUser(userData)

      // Verificar se deve trocar senha
      if (userData.must_change_password) {
        return {
          success: true,
          message: response.data.message,
          warning: response.data.warning,
          redirectTo: "/trocar-senha",
          mustChangePassword: true,
        }
      }

      return {
        success: true,
        message: response.data.message,
        redirectTo: "/dashboard",
      }
    } catch (error) {
      console.error("Erro no login:", error)
      return {
        success: false,
        message: error.response?.data?.message || "Erro ao fazer login",
      }
    }
  }

  const logout = () => {
    // Remover token do localStorage
    localStorage.removeItem("token")

    // Remover token do axios
    delete axios.defaults.headers.common["Authorization"]

    // Limpar estado do usuário
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser(userData)
  }

  const isAdmin = () => {
    return user?.role === "administrador"
  }

  const isAuthenticated = () => {
    return !!user
  }

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAdmin,
    isAuthenticated,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
