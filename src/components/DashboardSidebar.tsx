import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Settings,
  LogOut,
  Shield,
  Landmark,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ArrowLeftRight, label: "Transactions", path: "/transactions" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const DashboardSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, signOut, user } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sidebar text-sidebar-foreground min-h-screen p-6">
      <div className="flex items-center gap-2 mb-10">
        <Landmark className="h-7 w-7 text-sidebar-primary" />
        <span className="text-xl font-display font-bold text-sidebar-foreground">CashQuora</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === "/admin"
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            <Shield className="h-4 w-4" />
            Admin Panel
          </button>
        )}
      </nav>

      <div className="border-t border-sidebar-border pt-4 mt-4">
        <p className="text-xs text-sidebar-foreground/50 truncate mb-2">{user?.email}</p>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
