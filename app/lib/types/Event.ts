import { z } from "zod/v4"

const RawEventSchema = z.object({
    event_id: z.uuidv4(),
    name: z.string(),
    date: z.iso.date(),
    registration_opens: z.iso.datetime({ offset: true }),
    registration_closes: z.iso.datetime({ offset: true }),
    start_time: z.iso.datetime({ offset: true }),
    end_time: z.iso.datetime({ offset: true }),
    location: z.string(),
    blurb: z.string(),
    description: z.string(),
    media: z.array(z.url()),
    thumbnail: z.url(),
    member_price: z.number(),
    non_member_price: z.number(),
    max_attendees: z.number(),
    event_form_questions: z.json(),
    is_disabled: z.boolean(),
    registered: z.number(),
    needs_review: z.boolean(),
    external_page: z.url().nullable().optional(),
    waitlist_form: z.url().nullable().optional(),
});

const BasicEventSchema = RawEventSchema.pick({event_id: true, name: true})

const BasicEventsSchema = z.array(BasicEventSchema)

const EventSchema = RawEventSchema.transform((event) => ({
    eventId: event.event_id,
    name: event.name,
    date: event.date,
    blurb: event.blurb,
    description: event.description,
    registrationOpens: event.registration_opens,
    registrationCloses: event.registration_closes,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.location,
    thumbnail: event.thumbnail,
    memberPrice: event.member_price,
    nonMemberPrice: event.non_member_price,
    maxAttendees: event.max_attendees,
    eventFormQuestions: event.event_form_questions,
    media: event.media,
    isDisabled: event.is_disabled,
    registered: event.registered,
    needsReview: event.needs_review,
    externalPage: event.external_page,
    waitlistForm: event.waitlist_form,
}));

const EventsSchema = z.array(EventSchema)

export interface Event extends z.infer<typeof EventSchema> {}
export interface Events extends z.infer<typeof EventsSchema> {}
export interface BasicEvent extends z.infer<typeof BasicEventSchema> {}
export interface BasicEvents extends z.infer<typeof BasicEventsSchema> {}

export { EventSchema, EventsSchema, BasicEventSchema, BasicEventsSchema }