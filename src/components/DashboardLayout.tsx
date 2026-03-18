import { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";
import MobileNav from "./MobileNav";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 overflow-auto">
        {children}
      </main>
      <MobileNav />
    </div>
  );
};

export default DashboardLayout;
