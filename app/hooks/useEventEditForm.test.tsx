import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEventEditForm } from "./useEventEditForm";
import type { Event } from "@/lib/types/Event";

const updateEvent = vi.fn();
const updateThumbnail = vi.fn();

vi.mock("./useEvents", () => ({
    useEvents: () => ({ updateEvent, updateThumbnail }),
}));

const event = {
    eventId: "e1",
    name: "Staging Test",
    blurb: "b",
    description: "d",
    location: "l",
    maxAttendees: 10,
    startTime: "2026-03-01T18:30:00+00:00",
    endTime: "2026-03-01T20:00:00+00:00",
    registrationOpens: "2026-01-06T03:00:00+00:00",
    registrationCloses: "2027-02-01T07:59:00+00:00",
} as unknown as Event;

describe("useEventEditForm registration window", () => {
    beforeEach(() => {
        updateEvent.mockReset().mockResolvedValue(event);
        updateThumbnail.mockReset();
    });

    it("loads every timestamp into its own prefixed form fields", () => {
        const { result } = renderHook(() => useEventEditForm(event, vi.fn()));
        act(() => result.current.startEditing());

        expect(result.current.form).toMatchObject({
            startDay: "1", startMonth: "3", startYear: "2026",
            startHour: "6", startMinute: "30", startMeridiem: "PM",
            endHour: "8", endMinute: "00", endMeridiem: "PM",
            regOpenDay: "6", regOpenMonth: "1", regOpenYear: "2026",
            regOpenHour: "3", regOpenMinute: "00", regOpenMeridiem: "AM",
            regCloseDay: "1", regCloseMonth: "2", regCloseYear: "2027",
            regCloseHour: "7", regCloseMinute: "59", regCloseMeridiem: "AM",
        });
    });

    it("sends nothing when the form is untouched", async () => {
        const { result } = renderHook(() => useEventEditForm(event, vi.fn()));
        act(() => result.current.startEditing());
        await act(async () => await result.current.save());

        expect(updateEvent).not.toHaveBeenCalled();
    });

    it("sends both registration fields when either one changes", async () => {
        const { result } = renderHook(() => useEventEditForm(event, vi.fn()));
        act(() => result.current.startEditing());
        act(() => result.current.setField("regCloseHour", "9"));
        await act(async () => await result.current.save());

        expect(updateEvent).toHaveBeenCalledWith("e1", {
            registration_opens: "2026-01-06T03:00:00+00:00",
            registration_closes: "2027-02-01T09:59:00+00:00",
        });
    });

    it("leaves the registration window alone when only the event time changes", async () => {
        const { result } = renderHook(() => useEventEditForm(event, vi.fn()));
        act(() => result.current.startEditing());
        act(() => result.current.setField("startHour", "7"));
        await act(async () => await result.current.save());

        expect(updateEvent).toHaveBeenCalledWith("e1", {
            start_time: "2026-03-01T19:30:00+00:00",
            end_time: "2026-03-01T20:00:00+00:00",
        });
    });

    it("refuses to save an impossible registration date", async () => {
        const { result } = renderHook(() => useEventEditForm(event, vi.fn()));
        act(() => result.current.startEditing());
        act(() => result.current.setField("regOpenDay", "31"));
        act(() => result.current.setField("regOpenMonth", "2"));
        await act(async () => await result.current.save());

        expect(updateEvent).not.toHaveBeenCalled();
        expect(result.current.saveError).toMatch(/registration/i);
    });
});
