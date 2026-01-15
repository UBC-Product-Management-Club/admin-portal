import { useEvents } from "../hooks/useEvents"
import type { Event } from "../lib/types/Event";
import { useState, useEffect } from "react"

export default function EventPage({ event_id } : { event_id: string }) {
    const { getEvent } = useEvents();
    const [event, setEvent] = useState<Event | undefined>();

    useEffect(() => {
        getEvent(event_id).then((result) => setEvent(result)).catch((err) => console.error(err))
    }, [event_id])

    if (!event) {
        return <h1>Loading...</h1>
    }

    return (
        <div>
            <h1>{event_id}</h1>
            <h1>{event.name}</h1>
            <p>{event.description}</p>
            <p>{event.location}</p>
            <p>{event.date}</p>
            <p>{event.startTime}</p>
            <p>{event.endTime}</p>
            <p>{event.memberPrice}</p>
            <p>{event.nonMemberPrice}</p>
            <p>{event.maxAttendees}</p>
            <p>{event.registered}</p>
        </div>
    )
}