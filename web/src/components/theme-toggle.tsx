import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggler({ className }: ButtonProps) {
  const { theme, setTheme } = useTheme();

  const switchTheme = () => {
    if (theme === "dark") {
      setTheme("light");
      return;
    }

    setTheme("dark");
  };

  const toggleTheme = () => {
    if (!document.startViewTransition)
      switchTheme();

    document.startViewTransition(switchTheme);
  };


  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      className={cn("hover:bg-transparent", className)}
    >
      <SunIcon className="size-[1.2rem] rotate-0 scale-100 duration-300 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute size-[1.2rem] rotate-90 scale-0 duration-300 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
