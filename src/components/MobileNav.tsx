import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LayoutDashboard, ArrowLeftRight, DollarSign, Bell, User, LogOut } from "lucide-react";
import { useState } from "react";

const tabs = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: ArrowLeftRight, label: "History", path: "/transactions" },
  { icon: DollarSign, label: "Send", path: "/send" },
  { icon: Bell, label: "Alerts", path: "/notifications" },
  { icon: User, label: "Profile", path: "/settings" },
];

const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around py-2 px-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors rounded-lg ${
                isActive ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
        <button
          onClick={() => {
            if (showLogout) {
              signOut();
            } else {
              setShowLogout(true);
              setTimeout(() => setShowLogout(false), 3000);
            }
          }}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors rounded-lg ${
            showLogout ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          <LogOut className="h-5 w-5" />
          {showLogout ? "Confirm" : "Logout"}
        </button>
      </div>
    </nav>
  );
};

export default MobileNav;
