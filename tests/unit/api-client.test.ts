import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/setup";
import { createApi, ApiError } from "@/lib/api-client";
import { env } from "@/lib/env";

const api = createApi(async () => "test-token");

describe("api-client against MSW", () => {
  it("parses a successful response out of the data envelope", async () => {
    await expect(api.getHealth()).resolves.toEqual({
      ok: true,
      env: "test",
      dbLatencyMs: 12,
    });
  });

  it("sends the bearer token", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${env.NEXT_PUBLIC_API_URL}/api/v1/health`, ({ request }) => {
        authorization = request.headers.get("authorization");
        return HttpResponse.json({ data: { ok: true, env: "test", dbLatencyMs: 1 } });
      }),
    );

    await api.getHealth();

    expect(authorization).toBe("Bearer test-token");
  });

  it("turns an error envelope into an ApiError carrying the code and traceId", async () => {
    server.use(
      http.get(`${env.NEXT_PUBLIC_API_URL}/api/v1/health`, () =>
        HttpResponse.json(
          { error: { code: "INTERNAL", message: "Boom.", traceId: "req_1" } },
          { status: 500 },
        ),
      ),
    );

    await expect(api.getHealth()).rejects.toMatchObject({
      name: "ApiError",
      code: "INTERNAL",
      traceId: "req_1",
    });
    await expect(api.getHealth()).rejects.toBeInstanceOf(ApiError);
  });
});
