import { getSubmissionStatus } from "~/lib/event-submissions";

const now = new Date("2026-11-10T12:00:00Z");

describe("getSubmissionStatus", () => {
  it("is Closed when submissions were never opened", () => {
    expect(
      getSubmissionStatus(
        { submissionsOpenAt: null, submissionsCloseAt: null },
        now,
      ),
    ).toBe("Closed");
  });

  it("is Scheduled when the open time is in the future", () => {
    expect(
      getSubmissionStatus(
        { submissionsOpenAt: "2026-11-20T00:00:00Z", submissionsCloseAt: null },
        now,
      ),
    ).toBe("Scheduled");
  });

  it("is Open between the open and close times", () => {
    expect(
      getSubmissionStatus(
        {
          submissionsOpenAt: "2026-11-01T00:00:00Z",
          submissionsCloseAt: "2026-11-20T00:00:00Z",
        },
        now,
      ),
    ).toBe("Open");
  });

  it("is Closed after the close time", () => {
    expect(
      getSubmissionStatus(
        {
          submissionsOpenAt: "2026-11-01T00:00:00Z",
          submissionsCloseAt: "2026-11-05T00:00:00Z",
        },
        now,
      ),
    ).toBe("Closed");
  });
});
