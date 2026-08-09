import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
    Info,
    CalendarDays,
    Clock,
    Ticket,
    Users,
} from "lucide-react"
import { useState } from "react"
import { EventThumbnail } from "./event/EventThumbnail"
import { BlankInput, Field, SectionHeading } from "./event/EventFields"

// Scaffold for creating an event: the same sections and fields as the event detail
// page, rendered empty. Only the thumbnail is wired up so far — the picked file is
// held locally and nothing is uploaded until there is a create request to send it with.
export default function EventCreatePage() {
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [, setThumbnailFile] = useState<File | null>(null);

    const onFileSelected = (file: File, previewUrl: string) => {
        setThumbnailPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return previewUrl;
        });
        setThumbnailFile(file);
    };

    return (
        <div className="flex flex-col gap-6 py-4">
            <Card>
                <CardHeader className="text-center">
                    <Input
                        aria-label="Event name"
                        value=""
                        readOnly
                        placeholder="Event name"
                        className="mx-auto max-w-md text-center text-2xl font-semibold md:text-2xl"
                    />
                </CardHeader>
                <EventThumbnail
                    thumbnail={thumbnailPreview}
                    eventName=""
                    isEditing
                    onFileSelected={onFileSelected}
                />
                <CardContent className="flex flex-col gap-6">
                    {/* Key Event Details */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading icon={Info}>Key Event Details</SectionHeading>
                        <Field label="Blurb" htmlFor="new-event-blurb">
                            <Textarea id="new-event-blurb" value="" readOnly />
                        </Field>

                        <Field label="Description" htmlFor="new-event-description">
                            <Textarea id="new-event-description" value="" readOnly className="min-h-24" />
                        </Field>

                        <Field label="Location" htmlFor="new-event-location">
                            <BlankInput id="new-event-location" />
                        </Field>
                    </div>

                    <Separator />

                    {/* Schedule */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading icon={CalendarDays}>Schedule</SectionHeading>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Start Date" htmlFor="new-event-start-date">
                                <BlankInput id="new-event-start-date" />
                            </Field>
                            <Field label="End Date" htmlFor="new-event-end-date">
                                <BlankInput id="new-event-end-date" />
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Start Time" htmlFor="new-event-start-time">
                                <BlankInput id="new-event-start-time" />
                            </Field>
                            <Field label="End Time" htmlFor="new-event-end-time">
                                <BlankInput id="new-event-end-time" />
                            </Field>
                        </div>
                    </div>

                    <Separator />

                    {/* Registration Window */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading icon={Clock}>Registration Window</SectionHeading>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Registration Opens" htmlFor="new-event-registration-opens">
                                <BlankInput id="new-event-registration-opens" />
                            </Field>
                            <Field label="Registration Closes" htmlFor="new-event-registration-closes">
                                <BlankInput id="new-event-registration-closes" />
                            </Field>
                        </div>
                    </div>

                    <Separator />

                    {/* Pricing */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading icon={Ticket}>Pricing</SectionHeading>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Member Price" htmlFor="new-event-member-price">
                                <BlankInput id="new-event-member-price" />
                            </Field>
                            <Field label="Non-Member Price" htmlFor="new-event-non-member-price">
                                <BlankInput id="new-event-non-member-price" />
                            </Field>
                        </div>
                    </div>

                    <Separator />

                    {/* Capacity */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading icon={Users}>Capacity</SectionHeading>
                        <div className="grid grid-cols-2 gap-4 items-end">
                            <Field label="Max Attendees" htmlFor="new-event-max-attendees">
                                <BlankInput id="new-event-max-attendees" />
                            </Field>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
