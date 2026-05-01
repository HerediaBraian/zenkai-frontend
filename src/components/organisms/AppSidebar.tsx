import { useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Clock,
  DollarSign,
  ClipboardCheck,
  LogOut,
  Zap,
  Flame,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentRole, AppRole } from "@/hooks/useRole";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { title: string; url: string; icon: LucideIcon; allow: AppRole[] };

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, allow: ["super_admin", "admin", "usuario"] },
  { title: "Clientes", url: "/clientes", icon: Users, allow: ["super_admin", "admin", "usuario"] },
  { title: "Actividades", url: "/actividades", icon: Dumbbell, allow: ["super_admin", "admin", "usuario"] },
  { title: "Horarios", url: "/horarios", icon: Clock, allow: ["super_admin", "admin", "usuario"] },
  { title: "WODs", url: "/wods", icon: Flame, allow: ["super_admin"] },
  { title: "Ingresos", url: "/ingresos", icon: DollarSign, allow: ["super_admin", "admin"] },
  { title: "Asistencia", url: "/asistencia", icon: ClipboardCheck, allow: ["super_admin", "admin", "usuario"] },
  { title: "Administración", url: "/admin", icon: Shield, allow: ["super_admin", "admin"] },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { role, loading: roleLoading } = useCurrentRole();
  /** Mientras cargan roles, mostrar menú base (evita sidebar vacío). Sin rol tras cargar → mismo menú que "usuario" (RLS/RoleGuard siguen protegiendo rutas). */
  const visibleItems = useMemo(() => {
    const effective = role ?? (!roleLoading ? ("usuario" as AppRole) : null);
    if (effective) return navItems.filter((n) => n.allow.includes(effective));
    return navItems;
  }, [role, roleLoading]);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    if (isMobile) setOpenMobile(false);
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full border-r-0">
        <div className="flex items-center gap-3 px-4 py-7">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Zap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold text-sidebar-accent-foreground tracking-wide">ZENKAI</h1>
              <p className="text-xs text-sidebar-muted">Gestión Fitness</p>
            </div>
          )}
        </div>

        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title} className="mb-1">
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      onClick={handleNavClick}
                      className="flex items-center gap-3 rounded-lg px-3 py-4 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto pb-6">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-4 text-sm text-sidebar-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Cerrar sesión</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}