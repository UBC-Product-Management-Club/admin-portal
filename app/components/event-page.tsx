import { useEvents } from "../hooks/useEvents"
import { useEventEditForm } from "../hooks/useEventEditForm"
import type { Event } from "../lib/types/Event";
import { formatDate, formatTime } from "@/lib/utils";
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
import { DateParts, TimeParts } from "./event/EventDateTimeFields"
import { Field, ReadOnlyInput, SectionHeading, readOnlyStyles } from "./event/EventFields"

export default function EventPage({ event_id }: { event_id: string }) {
    const { getEvent } = useEvents();
    const [event, setEvent] = useState<Event | undefined>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
    } = useEventEditForm(event, setEvent);

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

    return (
        <div className="flex flex-col gap-6 py-4">
            {/* Event Info Card */}
            <Card>
                <CardHeader className="relative text-center">
                    <div className="absolute left-6 top-0 flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <Button size="sm" onClick={save} disabled={saving}>
                                    {saving ? "Saving..." : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Edit event"
                                onClick={startEditing}
                            >
                                <Pencil />
                            </Button>
                        )}
                    </div>
                    {isEditing && form ? (
                        <Input
                            aria-label="Event name"
                            value={form.name}
                            onChange={(e) => setField("name", e.target.value)}
                            className="mx-auto max-w-md text-center text-2xl font-semibold md:text-2xl"
                        />
                    ) : (
                        <CardTitle className="text-2xl">{event.name}</CardTitle>
                    )}
                </CardHeader>
                <EventThumbnail
                    thumbnail={thumbnailPreview ?? event.thumbnail}
                    eventName={event.name}
                    isEditing={isEditing}
                    onFileSelected={onFileSelected}
                />
                <CardContent className="flex flex-col gap-6">
                    {saveError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Couldn't save changes</AlertTitle>
                            <AlertDescription>{saveError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Key Event Details */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading icon={Info}>Key Event Details</SectionHeading>
                        <Field label="Blurb" htmlFor="event-blurb">
                            <Textarea
                                id="event-blurb"
                                value={form ? form.blurb : event.blurb}
                                onChange={(e) => setField("blurb", e.target.value)}
                                readOnly={!isEditing}
                                className={readOnlyStyles(isEditing)}
                            />
                        </Field>

                        <Field label="Description" htmlFor="event-description">
                            <Textarea
                                id="event-description"
                                value={form ? form.description : event.description}
                                onChange={(e) => setField("description", e.target.value)}
                                readOnly={!isEditing}
                                className={`min-h-24 ${readOnlyStyles(isEditing)}`}
                            />
                        </Field>

                        <Field label="Location" htmlFor="event-location">
                            <Input
                                id="event-location"
                                value={form ? form.location : event.location}
                                onChange={(e) => setField("location", e.target.value)}
                                readOnly={!isEditing}
                                className={readOnlyStyles(isEditing)}
                            />
                        </Field>
                    </div>

                    <Separator />

                    {/* Schedule */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading icon={CalendarDays}>Schedule</SectionHeading>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Start Date">
                                {isEditing && form ? (
                                    <DateParts form={form} setField={setField} prefix="start" />
                                ) : (
                                    <ReadOnlyInput value={formatDate(event.startTime)} />
                                )}
                            </Field>
                            <Field label="End Date">
                                {isEditing && form ? (
                                    <DateParts form={form} setField={setField} prefix="end" />
                                ) : (
                                    <ReadOnlyInput value={formatDate(event.endTime)} />
                                )}
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Start Time">
                                {isEditing && form ? (
                                    <TimeParts form={form} setField={setField} prefix="start" />
                                ) : (
                                    <ReadOnlyInput value={formatTime(event.startTime)} />
                                )}
                            </Field>
                            <Field label="End Time">
                                {isEditing && form ? (
                                    <TimeParts form={form} setField={setField} prefix="end" />
                                ) : (
                                    <ReadOnlyInput value={formatTime(event.endTime)} />
                                )}
                            </Field>
                        </div>
                    </div>

                    <Separator />

                    {/* Registration Window */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading icon={Clock}>Registration Window</SectionHeading>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Registration Opens">
                                {isEditing && form ? (
                                    <div className="flex flex-col gap-2">
                                        <DateParts form={form} setField={setField} prefix="regOpen" />
                                        <TimeParts form={form} setField={setField} prefix="regOpen" />
                                    </div>
                                ) : (
                                    <ReadOnlyInput
                                        value={`${formatDate(event.registrationOpens)}, ${formatTime(event.registrationOpens)}`}
                                    />
                                )}
                            </Field>
                            <Field label="Registration Closes">
                                {isEditing && form ? (
                                    <div className="flex flex-col gap-2">
                                        <DateParts form={form} setField={setField} prefix="regClose" />
                                        <TimeParts form={form} setField={setField} prefix="regClose" />
                                    </div>
                                ) : (
                                    <ReadOnlyInput
                                        value={`${formatDate(event.registrationCloses)}, ${formatTime(event.registrationCloses)}`}
                                    />
                                )}
                            </Field>
                        </div>
                    </div>

                    <Separator />

                    {/* Pricing */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading icon={Ticket}>Pricing</SectionHeading>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Member Price" htmlFor="event-member-price">
                                {isEditing && form ? (
                                    <Input
                                        id="event-member-price"
                                        inputMode="decimal"
                                        value={form.memberPrice}
                                        onChange={(e) => setField("memberPrice", e.target.value.replace(/[^0-9.]/g, ""))}
                                    />
                                ) : (
                                    <ReadOnlyInput
                                        id="event-member-price"
                                        value={`$${event.memberPrice.toFixed(2)}`}
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
                                    />
                                ) : (
                                    <ReadOnlyInput
                                        id="event-non-member-price"
                                        value={`$${event.nonMemberPrice.toFixed(2)}`}
                                    />
                                )}
                            </Field>
                        </div>
                    </div>

                    <Separator />

                    {/* Capacity */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading icon={Users}>Capacity</SectionHeading>
                        <div className="grid grid-cols-2 gap-4 items-end">
                            <Field label="Max Attendees" htmlFor="event-max-attendees">
                                <Input
                                    id="event-max-attendees"
                                    inputMode="numeric"
                                    value={form ? form.maxAttendees : String(event.maxAttendees)}
                                    onChange={(e) => setField("maxAttendees", e.target.value.replace(/\D/g, ""))}
                                    readOnly={!isEditing}
                                    className={readOnlyStyles(isEditing)}
                                />
                            </Field>
                            <Field label="Registered">
                                <Badge
                                    variant={event.registered >= event.maxAttendees ? "destructive" : "secondary"}
                                    className="w-fit text-sm px-3 py-1"
                                >
                                    {event.registered} / {event.maxAttendees} Registered
                                </Badge>
                            </Field>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
