import { useEvents } from "../hooks/useEvents"
import type { Event } from "../lib/types/Event";
import type { EventAttendee } from "@/lib/types/User";
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { ChevronDown, AlertCircle } from "lucide-react"

const attendeeColumns: ColumnDef<EventAttendee>[] = [
    {
        accessorKey: "firstName",
        header: "Name",
        enableColumnFilter: true,
        size: 150,
        cell: ({ row }) => (
            <div className="text-sm text-muted-foreground">
                {row.original.firstName} {row.original.lastName}
            </div>
        ),
        filterFn: (row, _, filterValue) => {
            const value = row.original.firstName + " " + row.original.lastName;
            return String(value.toLowerCase()).includes(filterValue.toLowerCase());
        },
    },
    {
        accessorKey: "email",
        header: "Email",
        size: 250,
        enableColumnFilter: true,
        cell: ({ row }) => <div className="text-sm">{row.getValue("email")}</div>,
    },
];

const attendeeFilterConfig: Record<
    string,
    { type: "select" | "text"; options?: { value: string; label: string }[] }
> = {
    firstName: {
        type: "text",
    },
    email: {
        type: "text",
    },
};

const formatDate = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};

const formatTime = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "UTC",
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};

export default function EventPage({ event_id }: { event_id: string }) {
    const { getEvent, getEventAttendees } = useEvents();
    const [event, setEvent] = useState<Event | undefined>();
    const [attendees, setAttendees] = useState<EventAttendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        Promise.all([
            getEvent(event_id).then((result) => setEvent(result)),
            getEventAttendees(event_id).then((result) => setAttendees(result)),
        ])
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load event data"))
            .finally(() => setLoading(false));
    }, [event_id, getEvent, getEventAttendees])

    if (loading) {
        return <p className="text-muted-foreground py-8 text-center">Loading event...</p>
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    if (!event) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>Event not found.</AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="flex flex-col gap-6 py-4">
            {/* Event Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">{event.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                    {/* Event Name */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="event-name">Event Name</Label>
                        <Input id="event-name" value={event.name} readOnly />
                    </div>

                    {/* Blurb */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="event-blurb">Blurb</Label>
                        <Textarea id="event-blurb" value={event.blurb} readOnly />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="event-description">Description</Label>
                        <Textarea id="event-description" value={event.description} readOnly className="min-h-24" />
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="event-location">Location</Label>
                        <Input id="event-location" value={event.location} readOnly />
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
                            <p className="text-[10px] text-muted-foreground font-mono">Raw: {event.startTime}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="event-end-time">End Time</Label>
                            <Input id="event-end-time" value={formatTime(event.endTime)} readOnly />
                            <p className="text-[10px] text-muted-foreground font-mono">Raw: {event.endTime}</p>
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
                            <Input id="event-max-attendees" value={String(event.maxAttendees)} readOnly />
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

            {/* Attendees Collapsible Section */}
            <Collapsible>
                <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between cursor-pointer">
                        <span>View Attendees ({event.registered})</span>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                    <DataTable
                        columns={attendeeColumns}
                        data={attendees}
                        filterConfig={attendeeFilterConfig}
                    />
                </CollapsibleContent>
            </Collapsible>
        </div>
    )
}