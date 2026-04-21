import { Type, Zap } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

interface Props {
  wordCount: number;
  correctionCount: number;
}

const StatsRow = ({ wordCount, correctionCount }: Props) => {
  const items = [
    {
      icon: Type,
      label: "Words Typed",
      value: wordCount,
      ring: "ring-emerald-500/20",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      icon: Zap,
      label: "Corrections",
      value: correctionCount,
      ring: "ring-purple-500/20",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ icon: Icon, label, value, ring, iconBg, iconColor }) => (
        <div
          key={label}
          className={`flex items-center gap-3 p-4 rounded-xl bg-card border border-border ring-1 ${ring}
            transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-medium)]`}
        >
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-foreground leading-none">
              <AnimatedCounter value={value} />
            </span>
            <span className="text-xs text-muted-foreground mt-1">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsRow;
