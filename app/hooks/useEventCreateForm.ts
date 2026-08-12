import { useState } from "react";
import { useNavigate } from "react-router";
import { useEvents } from "./useEvents";
import { fromFormFields, partsToISO, type DateTimePrefix, type EditForm } from "./useEventEditForm";
import type { EventCreatePayload } from "@/lib/types/Event";

const DATE_TIME_PREFIXES: DateTimePrefix[] = ["start", "end", "regOpen", "regClose"];

function emptyForm(): EditForm {
    const dateTimeFields = DATE_TIME_PREFIXES.reduce((fields, prefix) => {
        fields[`${prefix}Day`] = "";
        fields[`${prefix}Month`] = "";
        fields[`${prefix}Year`] = "";
        fields[`${prefix}Hour`] = "";
        fields[`${prefix}Minute`] = "";
        fields[`${prefix}Meridiem`] = "";
        return fields;
    }, {} as Record<string, string>);

    return {
        name: "",
        blurb: "",
        description: "",
        location: "",
        maxAttendees: "",
        memberPrice: "",
        nonMemberPrice: "",
        ...dateTimeFields,
    } as EditForm;
}

export function useEventCreateForm() {
    const navigate = useNavigate();
    const { createEvent } = useEvents();
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [form, setForm] = useState<EditForm>(emptyForm);
    // Held locally until Save: nothing is uploaded unless the event is actually created.
    const [pendingThumbnail, setPendingThumbnail] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

    const setField = (key: keyof EditForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (saveError) setSaveError(null);
    };

    const onFileSelected = (file: File, previewUrl: string) => {
        if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
        setPendingThumbnail(file);
        setThumbnailPreview(previewUrl);
    };

    // Nothing has been written or uploaded, so leaving is all it takes to discard.
    const cancel = () => {
        if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
        navigate("/events");
    };

    const save = async () => {
        const startISO = partsToISO(fromFormFields(form, "start"));
        const endISO = partsToISO(fromFormFields(form, "end"));
        if (!startISO || !endISO) {
            setSaveError("Enter a valid start and end date/time");
            return;
        }

        const regOpenISO = partsToISO(fromFormFields(form, "regOpen"));
        const regCloseISO = partsToISO(fromFormFields(form, "regClose"));
        if (!regOpenISO || !regCloseISO) {
            setSaveError("Enter a valid registration open and close date/time");
            return;
        }

        const payload: EventCreatePayload = {
            name: form.name,
            blurb: form.blurb,
            description: form.description,
            location: form.location,
            max_attendees: form.maxAttendees,
            member_price: form.memberPrice,
            non_member_price: form.nonMemberPrice,
            start_time: startISO,
            end_time: endISO,
            registration_opens: regOpenISO,
            registration_closes: regCloseISO,
        };

        setSaving(true);
        setSaveError(null);
        try {
            const created = await createEvent(payload, pendingThumbnail);
            if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
            navigate(`/events/${created.eventId}`);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to create event");
        } finally {
            setSaving(false);
        }
    };

    return {
        isEditing: true as const,
        saving,
        saveError,
        form,
        thumbnailPreview,
        setField,
        cancel,
        save,
        onFileSelected,
    };
}
