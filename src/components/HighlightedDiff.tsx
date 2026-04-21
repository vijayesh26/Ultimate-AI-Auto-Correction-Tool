interface Change {
  original: string;
  replacement: string;
  reason: string;
}

interface Props {
  original: string;
  corrected: string;
  changes: Change[];
}

// Render the corrected text and highlight any segment that matches a change.replacement
const HighlightedDiff = ({ original, corrected, changes }: Props) => {
  if (!changes?.length) {
    return <p className="text-foreground whitespace-pre-wrap leading-relaxed">{corrected}</p>;
  }

  // Build a regex that matches any replacement word (escaped)
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const replacements = Array.from(new Set(changes.map((c) => c.replacement).filter(Boolean)));
  if (!replacements.length) {
    return <p className="text-foreground whitespace-pre-wrap leading-relaxed">{corrected}</p>;
  }
  const re = new RegExp(`(${replacements.map(escape).join("|")})`, "g");
  const parts = corrected.split(re);

  return (
    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
      {parts.map((p, i) =>
        replacements.includes(p) ? (
          <span
            key={i}
            className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1 rounded font-medium"
          >
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  );
};

export default HighlightedDiff;
