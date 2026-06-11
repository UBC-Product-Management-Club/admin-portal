import { Card } from "@/components/ui/card";
import type { BasicEvent } from "@/lib/types/Event";

interface EventCardProps {
    event: BasicEvent;
    onClick?: (eventId: string) => void;
}

export default function EventCard({ event, onClick }: EventCardProps) {
    return (
        <Card
            className="group relative overflow-hidden cursor-pointer p-0 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
            onClick={() => onClick?.(event.event_id)}
        >
            {event.thumbnail ? (
                <div className="aspect-square w-full overflow-hidden">
                    <img
                        src={event.thumbnail}
                        alt={`${event.name} banner`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
            ) : (
                <div className="aspect-square w-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">No image</span>
                </div>
            )}
            <div className="px-4 py-3">
                <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                    {event.name}
                </h3>
            </div>
        </Card>
    );
}