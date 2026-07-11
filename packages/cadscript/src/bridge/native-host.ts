#!/usr/bin/env node
import { createServer, type Socket } from "node:net";
import { BRIDGE_PROTOCOL_VERSION, MAX_BRIDGE_PAYLOAD_BYTES, readBridgeConfig } from "./config.js";

interface LocalRequest {
  readonly protocolVersion: number;
  readonly token: string;
  readonly id: string;
  readonly type: "http" | "selection" | "health";
  readonly method?: "GET" | "POST" | "DELETE";
  readonly path?: string;
  readonly apiVersion?: 9 | 15;
  readonly query?: Record<string, string>;
  readonly body?: unknown;
}

interface NativeResponse {
  readonly id: string;
  readonly ok: boolean;
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: string;
  readonly error?: { code: string; message: string; retryAfterMs?: number };
}

const config = await readBridgeConfig();
const pending = new Map<string, { socket: Socket; timer: NodeJS.Timeout }>();
let nativeBuffer = Buffer.alloc(0);

function writeNative(message: unknown): void {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  if (body.length > MAX_BRIDGE_PAYLOAD_BYTES)
    throw new Error("Native message exceeds payload limit");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(header);
  process.stdout.write(body);
}

function errorResponse(id: string, code: string, message: string): NativeResponse {
  return { id, ok: false, status: 0, headers: {}, body: "", error: { code, message } };
}

function sendSocket(socket: Socket, message: NativeResponse): void {
  if (!socket.destroyed) socket.write(`${JSON.stringify(message)}\n`);
}

function validate(request: LocalRequest): void {
  if (request.protocolVersion !== BRIDGE_PROTOCOL_VERSION)
    throw new Error("Unsupported bridge protocol version");
  if (request.token !== config.token) throw new Error("Invalid bridge token");
  if (!request.id || !["http", "selection", "health"].includes(request.type))
    throw new Error("Malformed bridge request");
  if (request.type === "http") {
    if (
      !request.path ||
      !/^\/(documents|partstudios|parts|metadata)\//.test(`${request.path}/`) ||
      request.path.includes("..") ||
      request.path.includes("://")
    ) {
      throw new Error("Onshape path is outside the bridge allowlist");
    }
    if (!request.method || !["GET", "POST", "DELETE"].includes(request.method))
      throw new Error("HTTP method is outside the bridge allowlist");
  }
}

const server = createServer((socket) => {
  let buffer = "";
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    if (Buffer.byteLength(buffer) > MAX_BRIDGE_PAYLOAD_BYTES) {
      sendSocket(
        socket,
        errorResponse("unknown", "PAYLOAD_TOO_LARGE", "Bridge request exceeds the payload limit"),
      );
      socket.destroy();
      return;
    }
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (!line.trim()) continue;
      let request: LocalRequest;
      try {
        request = JSON.parse(line) as LocalRequest;
        validate(request);
      } catch (error) {
        sendSocket(
          socket,
          errorResponse(
            "unknown",
            "INVALID_REQUEST",
            error instanceof Error ? error.message : String(error),
          ),
        );
        continue;
      }
      const timer = setTimeout(() => {
        pending.delete(request.id);
        sendSocket(
          socket,
          errorResponse(
            request.id,
            "HOST_TIMEOUT",
            "Chrome did not answer the request within 35 seconds",
          ),
        );
        writeNative({ type: "cancel", id: request.id });
      }, 35_000);
      pending.set(request.id, { socket, timer });
      const { token: ignored, ...nativeRequest } = request;
      void ignored;
      writeNative(nativeRequest);
    }
  });
  socket.on("close", () => {
    for (const [id, entry] of pending) {
      if (entry.socket === socket) {
        clearTimeout(entry.timer);
        pending.delete(id);
        writeNative({ type: "cancel", id });
      }
    }
  });
  socket.on("error", (error) =>
    process.stderr.write(`[onshape-cadscript] local socket error: ${error.message}\n`),
  );
});

process.stdin.on("data", (chunk: Buffer) => {
  nativeBuffer = Buffer.concat([nativeBuffer, chunk]);
  while (nativeBuffer.length >= 4) {
    const length = nativeBuffer.readUInt32LE(0);
    if (length > MAX_BRIDGE_PAYLOAD_BYTES) {
      process.stderr.write("[onshape-cadscript] native response exceeded payload limit\n");
      process.exit(1);
    }
    if (nativeBuffer.length < 4 + length) return;
    const body = nativeBuffer.subarray(4, 4 + length);
    nativeBuffer = nativeBuffer.subarray(4 + length);
    try {
      const response = JSON.parse(body.toString("utf8")) as NativeResponse;
      const entry = pending.get(response.id);
      if (!entry) continue;
      clearTimeout(entry.timer);
      pending.delete(response.id);
      sendSocket(entry.socket, response);
    } catch (error) {
      process.stderr.write(`[onshape-cadscript] invalid native response: ${String(error)}\n`);
    }
  }
});

process.stdin.on("end", () => server.close(() => process.exit(0)));
server.listen(config.port, "127.0.0.1", () => {
  process.stderr.write(
    `[onshape-cadscript] bridge protocol ${BRIDGE_PROTOCOL_VERSION} listening on 127.0.0.1:${config.port}\n`,
  );
});
