import { useEffect, useState } from "react";

export type ColorMode = "light" | "dark";

const STORAGE_KEY = "erp-color-mode";
const CHANGE_EVENT = "erp-color-mode";

export function readColorMode(): ColorMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyColorMode(mode: ColorMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* private browsing can block storage */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: mode }));
}

export function useColorMode() {
  const [mode, setMode] = useState<ColorMode>(() => readColorMode());

  useEffect(() => {
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<ColorMode>).detail;
      setMode(next === "dark" ? "dark" : "light");
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  return mode;
}
