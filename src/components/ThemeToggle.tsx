"use client";

import { useEffect, useState } from "react";

import { MoonIcon, SunIcon } from "@/components/ui/Icons";

/**
 * The blocking script in layout.tsx already set data-theme before this
 * component ever mounts, so read it straight from the DOM rather than
 * defaulting to light and correcting after a flash.
 */
function currentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Reconciles with the DOM after hydration — SSR has no access to
  // localStorage, so the server-rendered icon is always the light-mode one.
  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#000000" : "#F2F2F7");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing or a full storage quota — the toggle still works
      // for this page load, it just won't persist across visits.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="btn btn-secondary btn-sm px-2"
    >
      {theme === "dark" ? (
        <SunIcon width={16} height={16} strokeWidth={2} />
      ) : (
        <MoonIcon width={16} height={16} strokeWidth={2} />
      )}
    </button>
  );
}
