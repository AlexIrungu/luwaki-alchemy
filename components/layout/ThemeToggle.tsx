"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "luwaki.theme";
type Theme = "light" | "dark";

const current = (): Theme =>
  (document.documentElement.dataset.theme as Theme | undefined) ??
  (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/**
 * Light / dark switch. With no stored choice the site follows the visitor's
 * system; a choice is stored and applied before paint by the script in
 * app/layout.tsx, so the page never flashes the other theme.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => setTheme(current()), []);

  const toggle = () => {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage can be blocked; the theme still applies for this visit.
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme ? `Switch to ${theme === "dark" ? "light" : "dark"} theme` : "Switch theme"}
      className="transition-opacity hover:opacity-60"
    >
      {/* The label waits for mount: the server can't know the visitor's theme. */}
      <span className={theme ? "" : "invisible"}>{theme === "dark" ? "LIGHT" : "DARK"}</span>
    </button>
  );
}
