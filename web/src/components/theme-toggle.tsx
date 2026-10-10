"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);
  function toggle() {
    const value = !dark;
    setDark(value);
    document.documentElement.dataset.theme = value ? "dark" : "light";
    try {
      localStorage.setItem("theme", value ? "dark" : "light");
    } catch {}
  }
  return (
    <button
      className="icon-button"
      aria-label={dark ? "切换浅色主题" : "切换深色主题"}
      onClick={toggle}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
