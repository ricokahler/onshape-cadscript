#!/usr/bin/env node
import { startMcpServer } from "./mcp.js";

startMcpServer().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
