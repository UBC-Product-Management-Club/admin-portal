import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { EditForm } from "@/hooks/useEventEditForm"

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));

interface PartsProps {
    form: EditForm;
    setField: (key: keyof EditForm, value: string) => void;
    prefix: "start" | "end";
}

// Day / Month / Year typed as numbers (digits only). Times are UTC (see useEventEditForm).
export function DateParts({ form, setField, prefix }: PartsProps) {
    const dayKey: keyof EditForm = `${prefix}Day`;
    const monthKey: keyof EditForm = `${prefix}Month`;
    const yearKey: keyof EditForm = `${prefix}Year`;
    const digits = (v: string) => v.replace(/\D/g, "");
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <Input aria-label="Day" inputMode="numeric" maxLength={2} placeholder="DD" className="w-14 text-center"
                    value={form[dayKey]} onChange={(e) => setField(dayKey, digits(e.target.value))} />
                <span className="text-muted-foreground">/</span>
                <Input aria-label="Month" inputMode="numeric" maxLength={2} placeholder="MM" className="w-14 text-center"
                    value={form[monthKey]} onChange={(e) => setField(monthKey, digits(e.target.value))} />
                <span className="text-muted-foreground">/</span>
                <Input aria-label="Year" inputMode="numeric" maxLength={4} placeholder="YYYY" className="w-20 text-center"
                    value={form[yearKey]} onChange={(e) => setField(yearKey, digits(e.target.value))} />
            </div>
            <p className="text-xs text-muted-foreground">Format: day / month / year</p>
        </div>
    );
}

// Hour (1-12), minute (00-59), and AM/PM as selects.
export function TimeParts({ form, setField, prefix }: PartsProps) {
    const hourKey: keyof EditForm = `${prefix}Hour`;
    const minuteKey: keyof EditForm = `${prefix}Minute`;
    const meridiemKey: keyof EditForm = `${prefix}Meridiem`;
    return (
        <div className="flex items-center gap-2">
            <Select value={form[hourKey]} onValueChange={(v) => setField(hourKey, v)}>
                <SelectTrigger className="w-18" aria-label="Hour"><SelectValue /></SelectTrigger>
                <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Input aria-label="Minute" inputMode="numeric" maxLength={2} placeholder="00" className="w-14 text-center"
                value={form[minuteKey]} onChange={(e) => setField(minuteKey, e.target.value.replace(/\D/g, ""))} />
            <Select value={form[meridiemKey]} onValueChange={(v) => setField(meridiemKey, v)}>
                <SelectTrigger className="w-20" aria-label="AM/PM"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
