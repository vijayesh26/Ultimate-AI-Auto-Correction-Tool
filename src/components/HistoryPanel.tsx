import { History, RotateCcw } from "lucide-react";

export interface HistoryEntry {
  id: string;
  original: string;
  corrected: string;
  language: string;
  ts: number;
}

interface Props {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
}

const truncate = (s: string, n = 60) => (s.length > n ? s.slice(0, n) + "…" : s);

const HistoryPanel = ({ entries, onRestore }: Props) => {
  if (!entries.length) return null;
  return (
    <div className="p-5 rounded-2xl bg-card border border-border" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Recent corrections</span>
      </div>
      <ul className="space-y-2">
        {entries.slice(0, 3).map((e) => (
          <li
            key={e.id}
            className="flex items-start justify-between gap-3 p-3 rounded-lg bg-background/60 border border-border hover:border-primary/40 transition-all duration-300"
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate">{truncate(e.corrected)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {e.language} · {new Date(e.ts).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => onRestore(e)}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-primary hover:bg-primary/10 transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Restore
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryPanel;
