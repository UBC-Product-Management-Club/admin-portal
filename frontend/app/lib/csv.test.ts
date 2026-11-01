import { toCsv } from "~/lib/csv";

describe("toCsv", () => {
  it("escapes commas, quotes and newlines and blanks out nulls", () => {
    expect(
      toCsv(
        ["Name", "Note"],
        [
          ["Ava", 'Said "hi", then left'],
          ["Liam", null],
          ["Maya", "line one\nline two"],
        ],
      ),
    ).toBe(
      'Name,Note\r\nAva,"Said ""hi"", then left"\r\nLiam,\r\nMaya,"line one\nline two"',
    );
  });
});
