import { useEvents } from "../hooks/useEvents"
import { useEventEditForm, type EditForm } from "../hooks/useEventEditForm"
import { useEventCreateForm } from "../hooks/useEventCreateForm"
import type { Event } from "../lib/types/Event";
import { useState, useEffect } from "react"
import { Spinner } from "./ui/spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    AlertCircle,
    Pencil,
    Info,
    CalendarDays,
    Clock,
    Ticket,
    Users,
} from "lucide-react"
import { EventThumbnail } from "./event/EventThumbnail"
import { DateTimeField } from "./event/EventDateTimeFields"
import { Field, ReadOnlyInput, Section, readOnlyStyles, toDisplay } from "./event/EventFields"

interface EventFormController {
    isEditing: boolean;
    saving: boolean;
    saveError: string | null;
    form: EditForm | null;
    thumbnailPreview: string | null;
    setField: (key: keyof EditForm, value: string) => void;
    startEditing?: () => void;
    cancel: () => void;
    save: () => void | Promise<void>;
    onFileSelected: (file: File, previewUrl: string) => void;
}

const PLACEHOLDERS = {
    name: "Name of your event",
    blurb: "One line for the events list",
    description: "What the event is, who it's for, what to bring",
    location: "Location of your event",
    price: "0.00",
    maxAttendees: "50",
};

function EventPageBody({
    event,
    controller,
    mode,
}: {
    event?: Event;
    controller: EventFormController;
    mode: "view" | "create";
}) {
    const {
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
    } = controller;

    const display = toDisplay(event);
    const isCreating = mode === "create";
    // Shared by every scheduling field.
    const dateTimeProps = { editing: isEditing, form, setField };

    return (
        <div className="flex flex-col gap-6 py-4">
            {/* Event Info Card */}
            <Card>
                <CardHeader className="relative text-center">
                    <div className="absolute left-6 top-0 flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <Button size="sm" onClick={save} disabled={saving}>
                                    {saving
                                        ? isCreating ? "Creating..." : "Saving..."
                                        : isCreating ? "Create" : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            startEditing && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Edit event"
                                    onClick={startEditing}
                                >
                                    <Pencil />
                                </Button>
                            )
                        )}
                    </div>
                    {isEditing && form ? (
                        <Input
                            aria-label="Event name"
                            value={form.name}
                            onChange={(e) => setField("name", e.target.value)}
                            placeholder={PLACEHOLDERS.name}
                            className="mx-auto max-w-md text-center text-2xl font-semibold md:text-2xl"
                        />
                    ) : (
                        <CardTitle className="text-2xl">{display.name}</CardTitle>
                    )}
                </CardHeader>
                <EventThumbnail
                    thumbnail={thumbnailPreview ?? display.thumbnail}
                    eventName={display.name}
                    isEditing={isEditing}
                    onFileSelected={onFileSelected}
                />
                <CardContent className="flex flex-col gap-6">
                    {saveError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>
                                {isCreating ? "Couldn't create event" : "Couldn't save changes"}
                            </AlertTitle>
                            <AlertDescription>{saveError}</AlertDescription>
                        </Alert>
                    )}

                    <Section icon={Info} title="Key Event Details">
                        <Field label="Blurb" htmlFor="event-blurb">
                            <Textarea
                                id="event-blurb"
                                value={form ? form.blurb : display.blurb}
                                onChange={(e) => setField("blurb", e.target.value)}
                                readOnly={!isEditing}
                                placeholder={PLACEHOLDERS.blurb}
                                className={readOnlyStyles(isEditing)}
                            />
                        </Field>

                        <Field label="Description" htmlFor="event-description">
                            <Textarea
                                id="event-description"
                                value={form ? form.description : display.description}
                                onChange={(e) => setField("description", e.target.value)}
                                readOnly={!isEditing}
                                placeholder={PLACEHOLDERS.description}
                                className={`min-h-24 ${readOnlyStyles(isEditing)}`}
                            />
                        </Field>

                        <Field label="Location" htmlFor="event-location">
                            <Input
                                id="event-location"
                                value={form ? form.location : display.location}
                                onChange={(e) => setField("location", e.target.value)}
                                readOnly={!isEditing}
                                placeholder={PLACEHOLDERS.location}
                                className={readOnlyStyles(isEditing)}
                            />
                        </Field>
                    </Section>

                    <Separator />

                    <Section icon={CalendarDays} title="Schedule">
                        <div className="grid grid-cols-2 gap-4">
                            <DateTimeField label="Start Date" prefix="start" parts="date" value={display.startDate} {...dateTimeProps} />
                            <DateTimeField label="End Date" prefix="end" parts="date" value={display.endDate} {...dateTimeProps} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <DateTimeField label="Start Time" prefix="start" parts="time" value={display.startTime} {...dateTimeProps} />
                            <DateTimeField label="End Time" prefix="end" parts="time" value={display.endTime} {...dateTimeProps} />
                        </div>
                    </Section>

                    <Separator />

                    <Section icon={Clock} title="Registration Window">
                        <div className="grid grid-cols-2 gap-4">
                            <DateTimeField label="Registration Opens" prefix="regOpen" parts="both" value={display.registrationOpens} {...dateTimeProps} />
                            <DateTimeField label="Registration Closes" prefix="regClose" parts="both" value={display.registrationCloses} {...dateTimeProps} />
                        </div>
                    </Section>

                    <Separator />

                    <Section icon={Ticket} title="Pricing">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Member Price" htmlFor="event-member-price">
                                {isEditing && form ? (
                                    <Input
                                        id="event-member-price"
                                        inputMode="decimal"
                                        value={form.memberPrice}
                                        onChange={(e) => setField("memberPrice", e.target.value.replace(/[^0-9.]/g, ""))}
                                        placeholder={PLACEHOLDERS.price}
                                    />
                                ) : (
                                    <ReadOnlyInput
                                        id="event-member-price"
                                        value={display.memberPrice}
                                    />
                                )}
                            </Field>
                            <Field label="Non-Member Price" htmlFor="event-non-member-price">
                                {isEditing && form ? (
                                    <Input
                                        id="event-non-member-price"
                                        inputMode="decimal"
                                        value={form.nonMemberPrice}
                                        onChange={(e) => setField("nonMemberPrice", e.target.value.replace(/[^0-9.]/g, ""))}
                                        placeholder={PLACEHOLDERS.price}
                                    />
                                ) : (
                                    <ReadOnlyInput
                                        id="event-non-member-price"
                                        value={display.nonMemberPrice}
                                    />
                                )}
                            </Field>
                        </div>
                    </Section>

                    <Separator />

                    <Section icon={Users} title="Capacity">
                        <div className="grid grid-cols-2 gap-4 items-end">
                            <Field label="Max Attendees" htmlFor="event-max-attendees">
                                <Input
                                    id="event-max-attendees"
                                    inputMode="numeric"
                                    value={form ? form.maxAttendees : display.maxAttendees}
                                    onChange={(e) => setField("maxAttendees", e.target.value.replace(/\D/g, ""))}
                                    readOnly={!isEditing}
                                    placeholder={PLACEHOLDERS.maxAttendees}
                                    className={readOnlyStyles(isEditing)}
                                />
                            </Field>
                            {/* No registrations to report until the event exists. */}
                            {event && (
                                <Field label="Registered">
                                    <Badge
                                        variant={event.registered >= event.maxAttendees ? "destructive" : "secondary"}
                                        className="w-fit text-sm px-3 py-1"
                                    >
                                        {event.registered} / {event.maxAttendees} Registered
                                    </Badge>
                                </Field>
                            )}
                        </div>
                    </Section>
                </CardContent>
            </Card>
        </div>
    );
}

// View/edit an existing event.
export default function EventPage({ event_id }: { event_id: string }) {
    const { getEvent } = useEvents();
    const [event, setEvent] = useState<Event | undefined>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const controller = useEventEditForm(event, setEvent);

    useEffect(() => {
        setLoading(true);
        setError(null);

        getEvent(event_id)
            .then((result) => setEvent(result))
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load event data"))
            .finally(() => setLoading(false));
    }, [event_id]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center py-16">
                <Spinner className="size-8 text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!event) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>Event not found.</AlertDescription>
            </Alert>
        );
    }

    return <EventPageBody event={event} controller={controller} mode="view" />;
}

// The same page with no event behind it: open for editing from the first render, and
// nothing is written or uploaded until Create succeeds.
export function EventCreatePage() {
    const controller = useEventCreateForm();

    return <EventPageBody controller={controller} mode="create" />;
}
