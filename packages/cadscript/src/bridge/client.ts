import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { BRIDGE_PROTOCOL_VERSION, MAX_BRIDGE_PAYLOAD_BYTES, readBridgeConfig } from "./config.js";
import type {
  OnshapeTransport,
  TransportRequest,
  TransportResponse,
} from "../onshape/transport.js";

interface BridgeResponse extends TransportResponse {
  readonly id: string;
  readonly ok: boolean;
  readonly error?: { code: string; message: string; retryAfterMs?: number };
}

export class BridgeTransport implements OnshapeTransport {
  constructor(private readonly timeoutMs = 30_000) {}

  async request(request: TransportRequest): Promise<TransportResponse> {
    const config = await readBridgeConfig();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const payload = {
        protocolVersion: BRIDGE_PROTOCOL_VERSION,
        token: config.token,
        id: randomUUID(),
        type: "http",
        method: request.method ?? "GET",
        path: request.path,
        apiVersion: request.apiVersion,
        query: request.query,
        body: request.body,
      };
      const response = await this.send(config.port, payload, request.signal);
      if (!response.ok && response.status === 0)
        throw new Error(
          `${response.error?.code ?? "BRIDGE_ERROR"}: ${response.error?.message ?? "Bridge request failed"}`,
        );
      if (response.status !== 429 || attempt === 3) {
        return { status: response.status, headers: response.headers, body: response.body };
      }
      const retryAfterMs = response.error?.retryAfterMs ?? 2_000 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfterMs, 15_000)));
    }
    throw new Error("Unreachable rate-limit retry state");
  }

  async health(): Promise<Record<string, unknown>> {
    const config = await readBridgeConfig();
    const response = await this.send(config.port, {
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      token: config.token,
      id: randomUUID(),
      type: "health",
    });
    return JSON.parse(response.body) as Record<string, unknown>;
  }

  async selection(): Promise<unknown> {
    const config = await readBridgeConfig();
    const response = await this.send(config.port, {
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      token: config.token,
      id: randomUUID(),
      type: "selection",
    });
    if (!response.ok) throw new Error(response.error?.message ?? "Selection request failed");
    return JSON.parse(response.body);
  }

  private async send(
    port: number,
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<BridgeResponse> {
    const serialized = `${JSON.stringify(payload)}\n`;
    if (Buffer.byteLength(serialized) > MAX_BRIDGE_PAYLOAD_BYTES)
      throw new Error("Bridge request exceeds the payload limit");
    return new Promise((resolve, reject) => {
      let buffer = "";
      const timer = setTimeout(
        () => finish(new Error(`Onshape bridge timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs,
      );
      const onAbort = () => finish(new Error("Onshape bridge request was cancelled"));
      signal?.addEventListener("abort", onAbort, { once: true });
      const finish = (error?: Error, response?: BridgeResponse) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        socket.destroy();
        if (error) reject(error);
        else resolve(response as BridgeResponse);
      };
      const socket = createConnection({ host: "127.0.0.1", port }, () => socket.write(serialized));
      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        if (Buffer.byteLength(buffer) > MAX_BRIDGE_PAYLOAD_BYTES)
          return finish(new Error("Bridge response exceeds the payload limit"));
        const newline = buffer.indexOf("\n");
        if (newline === -1) return;
        try {
          finish(undefined, JSON.parse(buffer.slice(0, newline)) as BridgeResponse);
        } catch (error) {
          finish(new Error(`Bridge returned invalid JSON: ${String(error)}`));
        }
      });
      socket.on("error", (error) =>
        finish(
          new Error(`Cannot connect to the Onshape bridge on 127.0.0.1:${port}: ${error.message}`),
        ),
      );
    });
  }
}
