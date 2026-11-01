import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: ReactNode;
  caption?: string;
  badge?: ReactNode;
};

export function StatCard({ label, value, caption, badge }: StatCardProps) {
  return (
    <div className="card-surface flex flex-col gap-1.5 px-5 py-[18px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        {badge}
      </div>
      <span className="text-[28px] font-semibold tracking-[-0.02em]">
        {value}
      </span>
      {caption && (
        <span className="text-xs text-muted-foreground">{caption}</span>
      )}
    </div>
  );
}
