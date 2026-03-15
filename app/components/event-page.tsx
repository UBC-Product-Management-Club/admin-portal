import { useEvents } from '../hooks/useEvents';
import type { EventDeliverables } from '../lib/types/Deliverable';
import type { Event } from '../lib/types/Event';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export default function EventPage({ event_id }: { event_id: string }) {
  const { getEvent, getEventDeliverables, downloadDeliverablesCsv } = useEvents();
  const [event, setEvent] = useState<Event | undefined>();
  const [deliverables, setDeliverables] = useState<EventDeliverables>({});
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventData = await getEvent(event_id);
        setEvent(eventData);
      } catch (err) {
        console.error(err);
      }

      try {
        setLoadingDeliverables(true);
        const deliverablesData = await getEventDeliverables(event_id);
        setDeliverables(deliverablesData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDeliverables(false);
      }
    };

    fetchData();
  }, [event_id, getEvent, getEventDeliverables]);

  // Get all unique phases across all teams
  const allPhases = Array.from(
    new Set(Object.values(deliverables).flatMap((team) => Object.keys(team.phases)))
  )
    .filter((phase) => phase !== 'unknown')
    .sort();

  if (!event) {
    return <h1>Loading...</h1>;
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{event.name}</CardTitle>
          <CardDescription>{event.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="font-medium">Location:</span> {event.location}
          </p>
          <p>
            <span className="font-medium">Date:</span> {event.date}
          </p>
          <p>
            <span className="font-medium">Time:</span> {event.startTime} - {event.endTime}
          </p>
          <p>
            <span className="font-medium">Pricing:</span> ${event.memberPrice} (member) / $
            {event.nonMemberPrice} (non-member)
          </p>
          <p>
            <span className="font-medium">Capacity:</span> {event.registered} / {event.maxAttendees}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deliverables</CardTitle>
          <CardDescription>Team submission status</CardDescription>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadDeliverablesCsv(event_id)}
              disabled={Object.keys(deliverables).length === 0}
            >
              Download CSV
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {loadingDeliverables ? (
            <p className="text-muted-foreground">Loading deliverables...</p>
          ) : Object.keys(deliverables).length === 0 ? (
            <p className="text-muted-foreground">No deliverables submitted yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  {allPhases.map((phase) => (
                    <TableHead key={phase}>{phase}</TableHead>
                  ))}
                  <TableHead>Last Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(deliverables).map(([teamName, teamData]) => (
                  <TableRow key={teamName}>
                    <TableCell className="font-medium">{teamName}</TableCell>
                    {allPhases.map((phase) => (
                      <TableCell key={phase}>
                        {teamData.phases[phase] ? (
                          <span className="text-green-600">✓ Submitted</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      {teamData.lastSubmittedAt
                        ? new Date(teamData.lastSubmittedAt).toLocaleString()
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
