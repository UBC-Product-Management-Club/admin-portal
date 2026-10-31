import { z } from "zod";

import { ApiError, RestClient } from "~/lib/api/rest-client";

vi.mock("~/lib/env", () => ({
  getEnv: () => ({ VITE_API_URL: "https://api.test" }),
}));

vi.mock("~/lib/supabase", () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: "jwt" } } }),
    },
  }),
}));

const client = RestClient.getInstance();

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("RestClient", () => {
  it("sends the bearer token to the admin namespace and parses the response", async () => {
    const fetchMock = mockFetch(200, { user_id: "u1" });
    const schema = z
      .object({ user_id: z.string() })
      .transform((u) => ({ userId: u.user_id }));

    await expect(client.get("/users/u1", schema)).resolves.toEqual({
      userId: "u1",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/api/v2/admin/users/u1");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer jwt");
  });

  it("throws ApiError with the backend's error code", async () => {
    mockFetch(404, { error: { code: "NOT_FOUND", message: "No such user" } });

    await expect(client.get("/users/x", z.unknown())).rejects.toMatchObject(
      new ApiError(404, "NOT_FOUND", "No such user"),
    );
  });

  it("fails loudly when the response shape drifts", async () => {
    mockFetch(200, { id: 1 });

    await expect(
      client.get("/users/u1", z.object({ user_id: z.string() })),
    ).rejects.toThrow(z.ZodError);
  });
});
