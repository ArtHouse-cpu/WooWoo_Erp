import { Moon, Sun } from "lucide-react";
import { applyColorMode, useColorMode } from "@/theme/theme";

type Props = {
  compact?: boolean;
};

export default function AppearanceButtons({ compact = false }: Props) {
  const mode = useColorMode();

  if (compact) {
    const next = mode === "dark" ? "light" : "dark";
    return (
      <button
        type="button"
        title={mode === "dark" ? "Switch to light" : "Switch to dark"}
        aria-label={mode === "dark" ? "Switch to light" : "Switch to dark"}
        onClick={() => applyColorMode(next)}
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
      >
        {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Color mode">
      <button
        type="button"
        aria-pressed={mode === "dark"}
        onClick={() => applyColorMode("dark")}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
          mode === "dark"
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <Moon size={14} />
        Dark
      </button>
      <button
        type="button"
        aria-pressed={mode === "light"}
        onClick={() => applyColorMode("light")}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
          mode === "light"
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <Sun size={14} />
        Light
      </button>
    </div>
  );
}
