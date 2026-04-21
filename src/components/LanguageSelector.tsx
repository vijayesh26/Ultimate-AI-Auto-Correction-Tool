import { Globe, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "English", label: "English" },
  { code: "Spanish", label: "Spanish" },
  { code: "French", label: "French" },
  { code: "German", label: "German" },
  { code: "Italian", label: "Italian" },
  { code: "Portuguese", label: "Portuguese" },
  { code: "Hindi", label: "Hindi" },
  { code: "Tamil", label: "Tamil" },
  { code: "Telugu", label: "Telugu" },
  { code: "Bengali", label: "Bengali" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const LanguageSelector = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === value) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card
          text-sm text-foreground hover:bg-secondary transition-colors"
      >
        <Globe className="h-4 w-4 text-primary" />
        <span>{current.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 mt-1.5 w-48 max-h-64 overflow-auto rounded-lg border border-border bg-popover shadow-[var(--shadow-medium)] z-50 animate-fade-in-up">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                onChange(l.code);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors
                ${l.code === value ? "text-primary font-semibold" : "text-foreground"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
