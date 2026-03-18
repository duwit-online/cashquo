import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, ArrowLeftRight, CreditCard, User } from "lucide-react";

const tabs = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: ArrowLeftRight, label: "Transfer", path: "/transactions" },
  { icon: CreditCard, label: "Cards", path: "/cards" },
  { icon: User, label: "Profile", path: "/settings" },
];

const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around py-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
                isActive ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
