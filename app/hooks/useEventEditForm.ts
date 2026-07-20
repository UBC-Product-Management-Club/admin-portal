import { useState } from "react";
import { useEvents } from "./useEvents";
import type { Event, EventUpdatePayload } from "@/lib/types/Event";

export interface EditForm {
    name: string;
    blurb: string;
    description: string;
    location: string;
    maxAttendees: string;
    // Date/time parts. Times are interpreted as UTC to match the app's display
    // (formatDate/formatTime render with timeZone: "UTC"). hour is "1".."12",
    // minute is "0".."59", meridiem is "AM" | "PM".
    startDay: string;
    startMonth: string;
    startYear: string;
    startHour: string;
    startMinute: string;
    startMeridiem: string;
    endDay: string;
    endMonth: string;
    endYear: string;
    endHour: string;
    endMinute: string;
    endMeridiem: string;
}

interface DateTimeParts {
    day: string;
    month: string;
    year: string;
    hour: string;
    minute: string;
    meridiem: string;
}

// Split a stored ISO datetime into UTC-based, 12-hour form fields.
function toParts(iso: string): DateTimeParts {
    const d = new Date(iso);
    const hours24 = d.getUTCHours();
    const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return {
        day: String(d.getUTCDate()),
        month: String(d.getUTCMonth() + 1),
        year: String(d.getUTCFullYear()),
        hour: String(hour12),
        minute: String(d.getUTCMinutes()).padStart(2, "0"),
        meridiem: hours24 >= 12 ? "PM" : "AM",
    };
}

// Rebuild an ISO datetime (UTC, "+00:00", no milliseconds) from form parts, or
// return null if the parts don't describe a real calendar date/time.
function partsToISO(p: DateTimeParts): string | null {
    const raw = [p.year, p.month, p.day, p.hour, p.minute];
    if (raw.some((s) => !s.trim())) return null;
    const [year, month, day, hour12, minute] = raw.map(Number);
    if (![year, month, day, hour12, minute].every(Number.isInteger)) return null;

    const hour24 =
        p.meridiem === "PM"
            ? hour12 === 12
                ? 12
                : hour12 + 12
            : hour12 === 12
                ? 0
                : hour12;

    // Round-tripping through Date catches every impossible value (Feb 30,
    // month 13, minute 99...)
    const d = new Date(Date.UTC(year, month - 1, day, hour24, minute));
    if (
        d.getUTCFullYear() !== year ||
        d.getUTCMonth() !== month - 1 ||
        d.getUTCDate() !== day ||
        d.getUTCHours() !== hour24 ||
        d.getUTCMinutes() !== minute
    ) {
        return null;
    }

    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour24)}:${pad(minute)}:00+00:00`;
}

export function useEventEditForm(
    event: Event | undefined,
    onSaved: (updated: Event) => void
) {
    const { updateEvent, updateThumbnail } = useEvents();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    // Editable fields, populated on entering edit mode and dropped on Cancel.
    const [form, setForm] = useState<EditForm | null>(null);
    // A newly picked thumbnail, held locally until Save so nothing touches
    // Supabase until the user commits the change.
    const [pendingThumbnail, setPendingThumbnail] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

    const clearPendingThumbnail = () => {
        setThumbnailPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setPendingThumbnail(null);
    };

    const setField = (key: keyof EditForm, value: string) => {
        setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
        if (saveError) setSaveError(null);
    };

    const onFileSelected = (file: File, previewUrl: string) => {
        if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
        setPendingThumbnail(file);
        setThumbnailPreview(previewUrl);
    };

    const startEditing = () => {
        if (!event) return;
        const s = toParts(event.startTime);
        const e = toParts(event.endTime);
        setForm({
            name: event.name,
            blurb: event.blurb,
            description: event.description,
            location: event.location,
            maxAttendees: String(event.maxAttendees),
            startDay: s.day,
            startMonth: s.month,
            startYear: s.year,
            startHour: s.hour,
            startMinute: s.minute,
            startMeridiem: s.meridiem,
            endDay: e.day,
            endMonth: e.month,
            endYear: e.year,
            endHour: e.hour,
            endMinute: e.minute,
            endMeridiem: e.meridiem,
        });
        setSaveError(null);
        setIsEditing(true);
    };

    const cancel = () => {
        clearPendingThumbnail();
        setForm(null);
        setSaveError(null);
        setIsEditing(false);
    };

    const save = async () => {
        if (!event) return;

        // Collect only the fields that actually changed. Field validation is the
        // backend's job (EventUpdateSchema rejects bad values and RestClient
        // surfaces its messages) — the one client-side check is that the typed
        // date parts form a real date, because an impossible date can't even be
        // encoded into the request (JS would silently roll Feb 30 into Mar 2).
        const payload: EventUpdatePayload = {};
        if (form) {
            const startISO = partsToISO({
                day: form.startDay,
                month: form.startMonth,
                year: form.startYear,
                hour: form.startHour,
                minute: form.startMinute,
                meridiem: form.startMeridiem,
            });
            const endISO = partsToISO({
                day: form.endDay,
                month: form.endMonth,
                year: form.endYear,
                hour: form.endHour,
                minute: form.endMinute,
                meridiem: form.endMeridiem,
            });
            if (!startISO || !endISO) {
                setSaveError("Enter a valid start and end date/time");
                return;
            }

            if (form.name !== event.name) payload.name = form.name;
            if (form.blurb !== event.blurb) payload.blurb = form.blurb;
            if (form.description !== event.description) payload.description = form.description;
            if (form.location !== event.location) payload.location = form.location;
            const maxAttendees = Number(form.maxAttendees);
            if (maxAttendees !== event.maxAttendees) payload.max_attendees = maxAttendees;

            // start_time and end_time must be sent together; include both if either changed.
            const startChanged = new Date(startISO).getTime() !== new Date(event.startTime).getTime();
            const endChanged = new Date(endISO).getTime() !== new Date(event.endTime).getTime();
            if (startChanged || endChanged) {
                payload.start_time = startISO;
                payload.end_time = endISO;
            }
        }

        const hasFieldChanges = Object.keys(payload).length > 0;
        if (!hasFieldChanges && !pendingThumbnail) {
            // Nothing to persist — just leave edit mode.
            cancel();
            return;
        }

        setSaving(true);
        setSaveError(null);
        try {
            let latest = event;
            if (hasFieldChanges) {
                latest = await updateEvent(event.eventId, payload);
            }
            if (pendingThumbnail) {
                latest = await updateThumbnail(event.eventId, pendingThumbnail);
            }
            onSaved(latest);
            clearPendingThumbnail();
            setForm(null);
            setIsEditing(false);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    return {
        isEditing,
        saving,
        saveError,
        form,
        thumbnailPreview,
        setField,
        startEditing,
        cancel,
        save,
        onFileSelected,
    };
}
