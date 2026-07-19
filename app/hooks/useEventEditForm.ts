import { useState } from "react";
import { useEvents } from "./useEvents";
import type { Event, EventUpdatePayload } from "@/lib/types/Event";

export interface EditForm {
    name: string;
    blurb: string;
    description: string;
    location: string;
    maxAttendees: string;
}

export function useEventEditForm(
    event: Event | undefined,
    onSaved: (updated: Event) => void
) {
    const { updateEvent, updateThumbnail } = useEvents();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    // Editable text fields, populated on entering edit mode and dropped on Cancel.
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
        setForm({
            name: event.name,
            blurb: event.blurb,
            description: event.description,
            location: event.location,
            maxAttendees: String(event.maxAttendees),
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

        // Collect only the text fields that actually changed.
        const payload: EventUpdatePayload = {};
        if (form) {
            if (!form.name.trim()) {
                setSaveError("Name can't be empty");
                return;
            }
            if (!form.location.trim()) {
                setSaveError("Location can't be empty");
                return;
            }
            const maxAttendees = Number(form.maxAttendees);
            if (!Number.isInteger(maxAttendees) || maxAttendees <= 0) {
                setSaveError("Max attendees must be a positive whole number");
                return;
            }

            if (form.name !== event.name) payload.name = form.name;
            if (form.blurb !== event.blurb) payload.blurb = form.blurb;
            if (form.description !== event.description) payload.description = form.description;
            if (form.location !== event.location) payload.location = form.location;
            if (maxAttendees !== event.maxAttendees) payload.max_attendees = maxAttendees;
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
