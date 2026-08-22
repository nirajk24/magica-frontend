import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client";
import { describeFailure } from "@/lib/failure";

const FALLBACK = "That run couldn't be stopped.";

describe("describeFailure", () => {
  it("falls back to the caller's copy when the request never reached the server", () => {
    expect(describeFailure(new TypeError("fetch failed"), FALLBACK)).toEqual({
      text: `${FALLBACK} Check your connection and try again.`,
      traceId: null,
    });
  });

  it("shows the trace id for a failure only the server can explain", () => {
    const failure = describeFailure(new ApiError("INTERNAL", "Something broke.", "req_7"), FALLBACK);

    expect(failure).toEqual({ text: "Something broke.", traceId: "req_7" });
  });

  it("omits the trace id where the message is already the whole explanation", () => {
    const failure = describeFailure(
      new ApiError("RUN_ALREADY_ACTIVE", "A run is already active in this chat.", "req_7"),
      FALLBACK,
    );

    expect(failure).toEqual({ text: "A run is already active in this chat.", traceId: null });
  });
});
