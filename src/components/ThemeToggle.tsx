// src/components/ThemeToggle.tsx
import { useTheme } from "../context/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
      <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
      <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
    </div>
  );
};