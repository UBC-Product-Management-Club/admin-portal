import { z } from 'zod/v4';

const TeamDeliverableSchema = z.object({
  phases: z.record(z.string(), z.string()),
  lastSubmittedAt: z.string().nullable(),
});

const EventDeliverablesSchema = z.record(z.string(), TeamDeliverableSchema);

type TeamDeliverable = z.infer<typeof TeamDeliverableSchema>;
type EventDeliverables = z.infer<typeof EventDeliverablesSchema>;

export { EventDeliverablesSchema, TeamDeliverableSchema };
export type { EventDeliverables, TeamDeliverable };
