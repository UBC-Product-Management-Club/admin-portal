import { MockClient } from "~/lib/api/mock-client";
import { ApiError } from "~/lib/api/rest-client";
import { attendeeListSchema } from "~/lib/types/attendee";
import { basicEventListSchema, eventSchema } from "~/lib/types/event";
import {
  reimbursementListSchema,
  reimbursementSchema,
} from "~/lib/types/reimbursement";
import { userListSchema } from "~/lib/types/user";

describe("MockClient", () => {
  const client = new MockClient();

  it("serves seed data that passes every response schema", async () => {
    const users = await client.get("/users", userListSchema);
    const events = await client.get("/events/basic", basicEventListSchema);
    const attendees = await client.get(
      "/events/evt-04/attendees",
      attendeeListSchema,
    );
    const requests = await client.get(
      "/reimbursements",
      reimbursementListSchema,
    );

    expect(users).toHaveLength(30);
    expect(events).toHaveLength(8);
    expect(attendees.length).toBeGreaterThan(0);
    expect(new Set(requests.map((r) => r.status))).toEqual(
      new Set(["submitted", "approved", "paid", "rejected"]),
    );
    expect(users[0]).toHaveProperty("firstName");
  });

  it("applies PATCH changes to an event", async () => {
    const updated = await client.patch("/events/evt-05", eventSchema, {
      location: "New room",
    });
    expect(updated.location).toBe("New room");
    expect((await client.get("/events/evt-05", eventSchema)).location).toBe(
      "New room",
    );
  });

  it("creates a reimbursement from multipart form data", async () => {
    const form = new FormData();
    form.set("item", "Tape");
    form.set("amount", "4.50");
    form.set("category", "other");
    form.set("purchase_date", "2026-10-30");
    form.set("etransfer_email", "exec@example.ca");
    const request = await client.post(
      "/reimbursements",
      reimbursementSchema,
      form,
    );
    expect(request).toMatchObject({
      item: "Tape",
      amount: 4.5,
      status: "submitted",
    });
  });

  it("returns a 404 ApiError for unknown events", async () => {
    await expect(
      client.get("/events/nope", eventSchema),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
