import { useEvents } from "../hooks/useEvents"
import { useEventEditForm } from "../hooks/useEventEditForm"
import type { Event } from "../lib/types/Event";
import { formatDate, formatTime } from "@/lib/utils";
import { useState, useEffect } from "react"
import { Spinner } from "./ui/spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Pencil } from "lucide-react"
import { EventThumbnail } from "./event/EventThumbnail"

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
                <CardContent className="flex flex-col gap-5">
                    {saveError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Couldn't save changes</AlertTitle>
                            <AlertDescription>{saveError}</AlertDescription>
                        </Alert>
                    )}
                    {/* Blurb */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="event-blurb">Blurb</Label>
                        <Textarea
                            id="event-blurb"
                            value={form ? form.blurb : event.blurb}
                            onChange={(e) => setField("blurb", e.target.value)}
                            readOnly={!isEditing}
                        />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="event-description">Description</Label>
                        <Textarea
                            id="event-description"
                            value={form ? form.description : event.description}
                            onChange={(e) => setField("description", e.target.value)}
                            readOnly={!isEditing}
                            className="min-h-24"
                        />
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="event-location">Location</Label>
                        <Input
                            id="event-location"
                            value={form ? form.location : event.location}
                            onChange={(e) => setField("location", e.target.value)}
                            readOnly={!isEditing}
                        />
                    </div>

                    {/* Start Date & End Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="event-start-date">Start Date</Label>
                            <Input id="event-start-date" value={formatDate(event.startTime)} readOnly />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="event-end-date">End Date</Label>
                            <Input id="event-end-date" value={formatDate(event.endTime)} readOnly />
                        </div>
                    </div>

                    {/* Start Time & End Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="event-start-time">Start Time</Label>
                            <Input id="event-start-time" value={formatTime(event.startTime)} readOnly />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="event-end-time">End Time</Label>
                            <Input id="event-end-time" value={formatTime(event.endTime)} readOnly />
                        </div>
                    </div>

                    {/* Member Price & Non-Member Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="event-member-price">Member Price</Label>
                            <Input id="event-member-price" value={`$${event.memberPrice.toFixed(2)}`} readOnly />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="event-non-member-price">Non-Member Price</Label>
                            <Input id="event-non-member-price" value={`$${event.nonMemberPrice.toFixed(2)}`} readOnly />
                        </div>
                    </div>

                    {/* Max Attendees & Capacity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="event-max-attendees">Max Attendees</Label>
                            <Input
                                id="event-max-attendees"
                                type="number"
                                min={1}
                                value={form ? form.maxAttendees : String(event.maxAttendees)}
                                onChange={(e) => setField("maxAttendees", e.target.value)}
                                readOnly={!isEditing}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Capacity</Label>
                            <Badge
                                variant={event.registered >= event.maxAttendees ? "destructive" : "secondary"}
                                className="w-fit text-sm px-3 py-1"
                            >
                                {event.registered} / {event.maxAttendees} Registered
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
