import { useParams } from 'react-router';
import EventPage from '@/components/event-page';

export default function EventDetail() {
    const { eventId } = useParams<{ eventId: string }>();

    if (!eventId) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Event not found.</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <EventPage event_id={eventId} />
        </div>
    );
}
