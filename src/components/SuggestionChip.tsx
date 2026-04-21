interface SuggestionChipProps {
  word: string;
  index: number;
  onClick: (word: string) => void;
}

const SuggestionChip = ({ word, index, onClick }: SuggestionChipProps) => {
  return (
    <button
      onClick={() => onClick(word)}
      className="group relative px-4 py-2.5 rounded-xl bg-card border border-border
        hover:border-primary/40 hover:shadow-[var(--shadow-glow)]
        transition-all duration-200 ease-out animate-fade-in-up min-h-[44px]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
        {word}
      </span>
    </button>
  );
};

export default SuggestionChip;
