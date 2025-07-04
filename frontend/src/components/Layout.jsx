"use client"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Building2,
  ChevronUp,
  Cog,
  FileText,
  GitBranch,
  Home,
  LogOut,
  Plus,
  Search,
  Upload,
  Users,
  Key,
  FileBarChart,
} from "lucide-react"

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  // Definir itens do menu baseado no papel do usuário
  const menuItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      description: "Visão geral do sistema",
    },
    {
      title: "Novo Registro",
      url: "/novo-registro",
      icon: Plus,
      description: "Criar novo registro",
    },
    {
      title: "Pesquisa",
      url: "/pesquisa",
      icon: Search,
      description: "Buscar registros",
    },
    {
      title: "Importação",
      url: "/importacao",
      icon: Upload,
      description: "Importar registros em lote",
    },
    {
      title: "Relatórios",
      url: "/relatorios",
      icon: FileBarChart,
      description: "Análises e relatórios",
    },
  ]

  // Itens administrativos (apenas para admin)
  const adminItems = [
    {
      title: "Usuários",
      url: "/usuarios",
      icon: Users,
      description: "Gerenciar usuários",
    },
    {
      title: "Obras",
      url: "/obras",
      icon: Building2,
      description: "Gerenciar obras",
    },
    {
      title: "Configurações",
      url: "/configuracoes",
      icon: Cog,
      description: "Configurações do sistema",
    },
    {
      title: "Workflow",
      url: "/workflow",
      icon: GitBranch,
      description: "Configurar notificações",
    },
  ]

  const isActiveRoute = (path) => {
    return location.pathname === path
  }

  const getUserInitials = (username) => {
    if (!username) return "U"
    return username
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case "administrador":
        return "Administrador"
      case "usuario_padrao":
        return "Usuário"
      default:
        return "Usuário"
    }
  }

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case "administrador":
        return "default"
      case "usuario_padrao":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <FileText className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">GEDO</span>
                    <span className="truncate text-xs">Gestão de Registros</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* Menu Principal */}
          <SidebarGroup>
            <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActiveRoute(item.url)} tooltip={item.description}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Menu Administrativo (apenas para admin) */}
          {isAdmin() && (
            <SidebarGroup>
              <SidebarGroupLabel>Administração</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActiveRoute(item.url)} tooltip={item.description}>
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">{getUserInitials(user?.username)}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.username}</span>
                      <span className="truncate text-xs">{getRoleLabel(user?.role)}</span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">{getUserInitials(user?.username)}</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user?.username}</span>
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs">{user?.email}</span>
                          <Badge variant={getRoleBadgeVariant(user?.role)} className="text-xs">
                            {getRoleLabel(user?.role)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/trocar-senha" className="cursor-pointer">
                      <Key className="mr-2 h-4 w-4" />
                      Trocar Senha
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            {/* Breadcrumb ou título da página atual pode ser adicionado aqui */}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
