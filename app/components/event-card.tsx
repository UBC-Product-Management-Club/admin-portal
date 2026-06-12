import { Card } from "@/components/ui/card";
import type { BasicEvent } from "@/lib/types/Event";

interface EventCardProps {
    event: BasicEvent;
    onClick?: (eventId: string) => void;
}

export default function EventCard({ event, onClick }: EventCardProps) {
    return (
        <Card
            className="group relative overflow-hidden cursor-pointer p-0 py-0 gap-0 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
            onClick={() => onClick?.(event.event_id)}
        >
            {event.thumbnail ? (
                <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
                    <img
                        src={event.thumbnail}
                        alt={`${event.name} banner`}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
            ) : (
                <div className="aspect-[4/5] w-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">No image</span>
                </div>
            )}
            <div className="px-3 py-2">
                <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-center">
                    {event.name}
                </h3>
            </div>
        </Card>
    );
}