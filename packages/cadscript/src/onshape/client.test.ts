import { describe, expect, it } from "vitest";
import { OnshapeClient } from "./client.js";
import type { OnshapeTransport, TransportRequest, TransportResponse } from "./transport.js";

describe("OnshapeClient", () => {
  it("uses Onshape's v9 Part Studio STL endpoint", async () => {
    let request: TransportRequest | undefined;
    const transport: OnshapeTransport = {
      async request(next): Promise<TransportResponse> {
        request = next;
        return { status: 200, headers: {}, body: "solid rail-coupon\nendsolid rail-coupon\n" };
      },
    };

    const client = new OnshapeClient(transport);
    await expect(
      client.exportStl({
        documentId: "document",
        workspaceId: "workspace",
        elementId: "element",
      }),
    ).resolves.toContain("solid rail-coupon");

    expect(request).toMatchObject({
      apiVersion: 9,
      path: "/partstudios/d/document/w/workspace/e/element/stl",
      query: { mode: "text", units: "millimeter" },
      responseType: "text",
    });
  });
});
