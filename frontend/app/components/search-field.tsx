import { Search } from "lucide-react";

type SearchFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: SearchFieldProps) {
  return (
    <label className="flex h-11 min-w-0 flex-[1_1_220px] items-center gap-2 rounded-[10px] border border-input bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <Search aria-hidden="true" className="size-4 text-muted-foreground" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}
