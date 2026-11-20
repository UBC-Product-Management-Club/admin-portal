import {
  fromDateTimeParts,
  isValidDate,
  toDateTimeParts,
} from "~/lib/date-parts";

describe("date parts", () => {
  it("rejects impossible calendar dates", () => {
    expect(isValidDate("2027-02-30")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2028-02-29")).toBe(true);
  });

  it("round-trips timestamps through Vancouver-time fields", () => {
    // 01:00 UTC on Nov 7 is still Nov 6 in Vancouver (PST, UTC-8).
    const parts = toDateTimeParts("2026-11-07T01:00:00Z");
    expect(parts).toEqual({ date: "2026-11-06", time: "17:00" });
    expect(fromDateTimeParts(parts)).toBe("2026-11-07T01:00:00.000Z");
  });

  it("uses the right offset on each side of daylight saving", () => {
    expect(fromDateTimeParts({ date: "2026-11-21", time: "18:00" })).toBe(
      "2026-11-22T02:00:00.000Z",
    );
    expect(fromDateTimeParts({ date: "2026-07-01", time: "18:00" })).toBe(
      "2026-07-02T01:00:00.000Z",
    );
  });

  it("returns null for incomplete or invalid parts", () => {
    expect(fromDateTimeParts({ date: "2026-11-07", time: "" })).toBeNull();
    expect(fromDateTimeParts({ date: "2026-02-30", time: "10:00" })).toBeNull();
    expect(fromDateTimeParts({ date: "2026-11-07", time: "24:00" })).toBeNull();
  });
});
