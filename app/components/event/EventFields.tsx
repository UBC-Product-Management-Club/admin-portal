import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn, formatDate, formatTime } from "@/lib/utils"
import type { Event } from "@/lib/types/Event"


function SectionHeading({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Icon className="h-4 w-4" />
            {children}
        </div>
    );
}

export function Section({ icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4">
            <SectionHeading icon={icon}>{title}</SectionHeading>
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

// Formatted values for fields that aren't being edited. Blank while creating, where
// there is no saved event behind the form.
export function toDisplay(event?: Event) {
    return {
        name: event?.name ?? "",
        thumbnail: event?.thumbnail ?? null,
        blurb: event?.blurb ?? "",
        description: event?.description ?? "",
        location: event?.location ?? "",
        startDate: event ? formatDate(event.startTime) : "",
        endDate: event ? formatDate(event.endTime) : "",
        startTime: event ? formatTime(event.startTime) : "",
        endTime: event ? formatTime(event.endTime) : "",
        registrationOpens: event
            ? `${formatDate(event.registrationOpens)}, ${formatTime(event.registrationOpens)}`
            : "",
        registrationCloses: event
            ? `${formatDate(event.registrationCloses)}, ${formatTime(event.registrationCloses)}`
            : "",
        memberPrice: event ? `$${event.memberPrice.toFixed(2)}` : "",
        nonMemberPrice: event ? `$${event.nonMemberPrice.toFixed(2)}` : "",
        maxAttendees: event ? String(event.maxAttendees) : "",
    };
}

