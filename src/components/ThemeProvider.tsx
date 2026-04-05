import { useEffect } from "react";

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored ? stored === "dark" : true; // dark by default
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return <>{children}</>;
};

export default ThemeProvider;
