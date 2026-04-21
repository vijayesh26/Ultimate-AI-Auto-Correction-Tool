import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  Type,
  ArrowRight,
  Wand2,
  Loader2,
  Globe,
  AlertCircle,
  Check,
  X,
  Copy,
  Download,
  Replace,
  Keyboard,
} from "lucide-react";
import { toast } from "sonner";
import { getEngine } from "@/lib/autocorrect";
import { supabase } from "@/integrations/supabase/client";
import SuggestionChip from "@/components/SuggestionChip";
import StatsRow from "@/components/StatsRow";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LanguageSelector from "@/components/LanguageSelector";
import HighlightedDiff from "@/components/HighlightedDiff";
import HistoryPanel, { HistoryEntry } from "@/components/HistoryPanel";

const MAX_SUGGESTIONS = 5;
const DEBOUNCE_MS = 450;
const MAX_CHARS = 2000;
const ROTATING_PLACEHOLDERS = [
  "Type or paste text in any language…",
  "e.g. 'i has went to the stor yestrday'",
  "Try: 'Je suis aller au marché hier'",
  "Try: 'Mai school jaa raha tha'",
  "Try: 'Ela vai a escola amanha'",
];

interface Change {
  original: string;
  replacement: string;
  reason: string;
}

interface CorrectionResult {
  language: string;
  corrected: string;
  changes: Change[];
}

const Index = () => {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [correctionCount, setCorrectionCount] = useState(0);

  const [correcting, setCorrecting] = useState(false);
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [language, setLanguage] = useState<string>("auto");
  const [realtime, setRealtime] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestTimer = useRef<number | null>(null);
  const lastQueriedWord = useRef<string>("");
  const engine = useMemo(() => getEngine(), []);

  // Rotating placeholder
  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % ROTATING_PLACEHOLDERS.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  const extractWord = (word: string): [string, string, string] => {
    const match = word.match(/^(\W*)([\p{L}\p{M}\p{N}'-]+)(\W*)$/u);
    if (match) return [match[1], match[2], match[3]];
    return ["", word, ""];
  };

  const fetchSuggestionsForWord = useCallback(
    async (word: string) => {
      if (!word || word.length < 2) {
        setSuggestions([]);
        return;
      }
      if (lastQueriedWord.current === word) return;
      lastQueriedWord.current = word;

      const local = engine.correctSpelling(word);
      if (local.length > 0 && local[0][0] !== word) {
        setSuggestions(local.slice(0, MAX_SUGGESTIONS).map(([w]) => w));
      }

      setSuggestLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("correct-text", {
          body: { text: word, mode: "word", language: language === "auto" ? undefined : language },
        });
        if (error) throw error;
        if (data?.suggestions?.length) {
          const filtered = data.suggestions
            .filter((s: string) => s && s.toLowerCase() !== word.toLowerCase())
            .slice(0, MAX_SUGGESTIONS);
          if (filtered.length) setSuggestions(filtered);
          else setSuggestions([]);
        }
      } catch (e) {
        console.error("word suggest error", e);
      } finally {
        setSuggestLoading(false);
      }
    },
    [engine, language]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value.slice(0, MAX_CHARS);
      setText(newText);
      setResult(null);
      setError(null);

      if (!realtime) {
        setSuggestions([]);
        return;
      }

      const trimmed = newText.replace(/\s+$/, "");
      const lastSpace = Math.max(trimmed.lastIndexOf(" "), trimmed.lastIndexOf("\n"));
      const lastWordRaw = trimmed.slice(lastSpace + 1);
      const [, core] = extractWord(lastWordRaw);
      const word = core?.toLowerCase() ?? "";

      if (newText.endsWith(" ") || newText.endsWith("\n") || !word) {
        setSuggestions([]);
        if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
        return;
      }

      if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
      suggestTimer.current = window.setTimeout(() => {
        fetchSuggestionsForWord(word);
      }, DEBOUNCE_MS);
    },
    [fetchSuggestionsForWord, realtime]
  );

  const applySuggestion = useCallback(
    (newWord: string) => {
      const trimmed = text.replace(/\s+$/, "");
      const lastSpace = Math.max(trimmed.lastIndexOf(" "), trimmed.lastIndexOf("\n"));
      const before = trimmed.slice(0, lastSpace + 1);
      const lastWordRaw = trimmed.slice(lastSpace + 1);
      const [prefix, , suffix] = extractWord(lastWordRaw);
      const replaced = `${before}${prefix}${newWord}${suffix} `;
      setText(replaced);
      setSuggestions([]);
      lastQueriedWord.current = "";
      setCorrectionCount((c) => c + 1);
      textareaRef.current?.focus();
    },
    [text]
  );

  const correctAll = useCallback(async () => {
    if (!text.trim() || correcting) return;
    setCorrecting(true);
    setError(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("correct-text", {
        body: {
          text,
          mode: "full",
          language: language === "auto" ? undefined : language,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const res = data as CorrectionResult;
      setResult(res);
      setHistory((h) => [
        { id: crypto.randomUUID(), original: text, corrected: res.corrected, language: res.language, ts: Date.now() },
        ...h,
      ].slice(0, 5));
      toast.success("Text corrected", {
        description: `${res.changes?.length ?? 0} change${res.changes?.length === 1 ? "" : "s"} · ${res.language}`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to correct text";
      setError(msg);
      toast.error("Correction failed", { description: msg });
    } finally {
      setCorrecting(false);
    }
  }, [text, correcting, language]);

  const replaceText = useCallback(() => {
    if (!result) return;
    setText(result.corrected);
    setCorrectionCount((c) => c + (result.changes?.length || 1));
    setResult(null);
    setSuggestions([]);
    toast.success("Replaced with corrected text");
  }, [result]);

  const copyCorrected = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.corrected);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [result]);

  const downloadCorrected = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.corrected], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `corrected-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  }, [result]);

  const clearText = useCallback(() => {
    setText("");
    setSuggestions([]);
    setResult(null);
    setError(null);
    textareaRef.current?.focus();
  }, []);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    };
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + Enter to correct
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        correctAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [correctAll]);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  return (
    <div className="min-h-screen bg-background" style={{ background: "var(--gradient-surface)" }}>
      <div
        className="fixed inset-x-0 top-0 h-96 pointer-events-none"
        style={{ background: "var(--gradient-glow)" }}
      />

      <Navbar />

      <main id="home" className="relative max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Hero */}
        <header className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {correcting ? "AI Processing…" : "AI Ready"}
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-foreground tracking-tight mb-4 leading-[1.05]">
            Smart Spelling
            <span
              className="bg-clip-text text-transparent ml-2 font-light italic"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              & Grammar
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
            Type in any language. Get instant suggestions and one-click sentence-level correction.
          </p>
        </header>

        {/* Stats */}
        <div className="mb-10 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <StatsRow wordCount={wordCount} correctionCount={correctionCount} />
        </div>

        {/* Toolbar */}
        <div
          id="features"
          className="relative z-30 flex flex-wrap items-center justify-between gap-3 mb-3 animate-fade-in-up"
          style={{ animationDelay: "150ms" }}
        >
          <LanguageSelector value={language} onChange={setLanguage} />
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <span>Real-time</span>
            <button
              type="button"
              role="switch"
              aria-checked={realtime}
              onClick={() => setRealtime((r) => !r)}
              className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${
                realtime ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition-transform duration-300 ${
                  realtime ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Input */}
        <div
          className="relative mb-4 animate-fade-in-up group"
          style={{ animationDelay: "200ms" }}
        >
          <div className="absolute top-3 left-4 flex items-center gap-2 text-muted-foreground z-10">
            <Type className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Input</span>
          </div>

          {text && (
            <button
              onClick={clearText}
              aria-label="Clear text"
              className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full bg-secondary text-muted-foreground
                hover:bg-destructive/10 hover:text-destructive transition-all duration-200 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder={ROTATING_PLACEHOLDERS[placeholderIdx]}
            maxLength={MAX_CHARS}
            className="w-full min-h-[220px] p-4 pt-10 rounded-2xl bg-card border border-border
              text-foreground text-base sm:text-lg leading-relaxed resize-y
              placeholder:text-muted-foreground/50 placeholder:transition-opacity
              focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary/60
              focus:shadow-[var(--shadow-glow)]
              transition-all duration-300"
            style={{ boxShadow: "var(--shadow-soft)" }}
          />

          <div className="flex items-center justify-between px-1 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Keyboard className="h-3 w-3" />
              <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-[10px] font-mono">
                Ctrl
              </kbd>
              +
              <kbd className="px-1.5 py-0.5 rounded bg-secondary text-foreground text-[10px] font-mono">
                Enter
              </kbd>
              to correct
            </span>
            <span>
              {wordCount} words · {charCount} / {MAX_CHARS}
            </span>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={correctAll}
            disabled={!text.trim() || correcting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-primary-foreground
              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
              transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-medium)] active:scale-[0.98]"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            {correcting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {correcting ? "Correcting…" : "Correct text"}
          </button>
          {suggestLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Looking up suggestions…
            </span>
          )}
        </div>

        {/* Word suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary animate-pulse-glow" />
              <span className="text-sm font-semibold text-foreground">Suggestions</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((word, i) => (
                <SuggestionChip key={`${word}-${i}`} word={word} index={i} onClick={applySuggestion} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-fade-in-up">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Output / correction result */}
        {result && (
          <div
            className="mb-10 p-5 rounded-2xl bg-card border border-border animate-fade-in-up transition-all duration-300 hover:shadow-[var(--shadow-medium)]"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Corrected ({result.language})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCorrected}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  onClick={downloadCorrected}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button
                  onClick={replaceText}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  <Replace className="h-3.5 w-3.5" /> Replace
                </button>
              </div>
            </div>

            <HighlightedDiff original={text} corrected={result.corrected} changes={result.changes ?? []} />

            {result.changes?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {result.changes.length} change{result.changes.length === 1 ? "" : "s"}
                </p>
                <ul className="space-y-1.5">
                  {result.changes.slice(0, 8).map((c, i) => (
                    <li key={i} className="text-sm flex flex-wrap items-center gap-2">
                      <span className="font-mono text-destructive line-through">{c.original}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        {c.replacement}
                      </span>
                      <span className="text-muted-foreground text-xs">— {c.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div id="about" className="mb-10">
          <HistoryPanel
            entries={history}
            onRestore={(e) => {
              setText(e.original);
              setResult({ language: e.language, corrected: e.corrected, changes: [] });
              toast.success("History entry restored");
            }}
          />
        </div>

        <div className="flex items-center justify-center">
          <Check className="h-3 w-3 text-emerald-500 mr-1" />
          <span className="text-xs text-muted-foreground">
            All processing happens securely on your request.
          </span>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
