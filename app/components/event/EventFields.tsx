import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"


export function SectionHeading({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Icon className="h-4 w-4" />
            {children}
        </div>
    );
}

export function readOnlyStyles(isEditing: boolean) {
    return !isEditing
        ? "border-transparent shadow-none px-0 bg-transparent read-only:opacity-100"
        : "";
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}

export function ReadOnlyInput({ value, id, className }: { value: string; id?: string; className?: string }) {
    return <Input id={id} value={value} readOnly className={cn(readOnlyStyles(false), className)} />;
}

export function BlankInput({ id, className }: { id?: string; className?: string }) {
    return <Input id={id} value="" readOnly className={className} />;
}
