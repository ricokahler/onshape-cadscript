import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { BridgeTransport } from "./bridge/client.js";
import { materializeModel } from "./core/model.js";
import { renderSketchSvg } from "./core/preview.js";
import { OnshapeClient } from "./onshape/client.js";
import { applyPlan, createPlan, planSummary, readPlan, writePlan } from "./runtime/planner.js";
import { loadProject, readProjectState } from "./runtime/project.js";
import { CADSCRIPT_VERSION } from "./version.js";

const cwdSchema = {
  cwd: z
    .string()
    .optional()
    .describe("CadScript project directory; defaults to the MCP server working directory"),
};
const targetSchema = {
  documentId: z.string(),
  workspaceId: z.string(),
  elementId: z.string(),
};

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

async function context(cwd?: string) {
  const project = await loadProject(cwd ?? process.cwd());
  const model = await materializeModel(project.model, project.config.parameters as never);
  return { project, model };
}

function bridgeAndClient() {
  const bridge = new BridgeTransport();
  return { bridge, client: new OnshapeClient(bridge) };
}

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "onshape-cadscript", version: CADSCRIPT_VERSION });

  server.registerTool(
    "cadscript_project_inspect",
    {
      title: "Inspect CadScript project",
      description:
        "Load the project, validate parameters and stable IDs, and return the pure model tree without touching Onshape.",
      inputSchema: cwdSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ cwd }) => {
      const { project, model } = await context(cwd);
      return textResult({ root: project.root, config: project.config, model });
    },
  );

  server.registerTool(
    "cadscript_sketch_preview",
    {
      title: "Preview a CadScript sketch",
      description:
        "Render a model sketch from the shared sketch AST as SVG without touching Onshape.",
      inputSchema: { ...cwdSchema, sketchId: z.string().optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ cwd, sketchId }) => {
      const { model } = await context(cwd);
      return { content: [{ type: "text", text: renderSketchSvg(model, sketchId) }] };
    },
  );

  server.registerTool(
    "cadscript_bridge_health",
    {
      title: "Check Onshape bridge",
      description: "Check the native host, Chrome extension, and visible Onshape tabs.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => textResult(await new BridgeTransport(5_000).health()),
  );

  server.registerTool(
    "onshape_documents",
    {
      title: "List Onshape documents",
      description: "List documents visible through the user's signed-in Onshape browser session.",
      inputSchema: { query: z.string().optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ query }) => textResult(await bridgeAndClient().client.listDocuments(query)),
  );

  server.registerTool(
    "onshape_project_create",
    {
      title: "Create dedicated Onshape project",
      description:
        "Create a new Onshape document and a dedicated empty Part Studio for one CadScript model.",
      inputSchema: { name: z.string().min(1), isPublic: z.boolean().optional() },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ name, isPublic }) => {
      const onshape = bridgeAndClient().client;
      const document = await onshape.createDocument(name, isPublic ?? false);
      const documentId = String(document.id ?? "");
      const workspace = document.defaultWorkspace as Record<string, unknown> | undefined;
      const workspaceId = String(workspace?.id ?? "");
      if (!documentId || !workspaceId)
        throw new Error("Onshape did not return document and workspace IDs");
      const partStudio = await onshape.createPartStudio(
        documentId,
        workspaceId,
        `${name} - CadScript`,
      );
      const elementId = String(partStudio.id ?? partStudio.elementId ?? "");
      if (!elementId) throw new Error("Onshape did not return a Part Studio element ID");
      return textResult({ documentId, workspaceId, elementId, name: `${name} - CadScript` });
    },
  );

  server.registerTool(
    "onshape_selection",
    {
      title: "Read Onshape selection",
      description: "Read the current entity selection using the bridge's narrow selection adapter.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => textResult(await bridgeAndClient().bridge.selection()),
  );

  server.registerTool(
    "onshape_partstudio_observe",
    {
      title: "Observe Part Studio",
      description: "Read a Part Studio feature tree and regeneration notices.",
      inputSchema: targetSchema,
      annotations: { readOnlyHint: true },
    },
    async (target) => textResult(await bridgeAndClient().client.observe(target)),
  );

  server.registerTool(
    "cadscript_model_plan",
    {
      title: "Plan CadScript model changes",
      description:
        "Create and persist a read-only, content-addressed plan. Applying requires the exact returned plan ID.",
      inputSchema: { ...cwdSchema, adopt: z.boolean().optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ cwd, adopt }) => {
      const { project, model } = await context(cwd);
      if (!project.config.target) throw new Error("cadscript.config.ts has no Onshape target");
      const observation = await bridgeAndClient().client.observe(project.config.target);
      const plan = createPlan(
        model,
        project.config.target,
        observation,
        await readProjectState(project.root),
        adopt === undefined ? {} : { adopt },
      );
      const path = await writePlan(project.root, plan);
      return textResult({
        summary: planSummary(plan),
        planId: plan.planId,
        path,
        operations: plan.operations,
      });
    },
  );

  server.registerTool(
    "cadscript_model_apply",
    {
      title: "Apply an approved CadScript plan",
      description:
        "Apply one exact plan ID, reject stale microversions, checkpoint before deletion, and verify a clean no-op result.",
      inputSchema: { ...cwdSchema, planId: z.string().length(64) },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    async ({ cwd, planId }) => {
      const { project, model } = await context(cwd);
      const plan = await readPlan(project.root, planId);
      const result = await applyPlan(bridgeAndClient().client, project.root, model, plan);
      return textResult({
        appliedPlanId: planId,
        microversionId: result.observation.microversionId,
        featureCount: result.observation.features.length,
        verificationPlanId: result.verificationPlan.planId,
      });
    },
  );

  server.registerTool(
    "onshape_render",
    {
      title: "Render Part Studio",
      description: "Render a shaded PNG view and return visible image content to Codex.",
      inputSchema: {
        ...targetSchema,
        view: z.enum(["isometric", "top", "bottom", "front", "back", "left", "right"]).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ view, ...target }) => {
      const images = await bridgeAndClient().client.render(target, { ...(view ? { view } : {}) });
      if (!images[0]) throw new Error("Onshape returned no rendered image");
      return { content: [{ type: "image", data: images[0], mimeType: "image/png" }] };
    },
  );

  server.registerTool(
    "onshape_measure",
    {
      title: "Measure Part Studio",
      description:
        "Return bounding box and approximate mass properties using a fixed read-only FeatureScript query.",
      inputSchema: targetSchema,
      annotations: { readOnlyHint: true },
    },
    async (target) =>
      textResult(
        await bridgeAndClient().client.evaluateFeatureScript(
          target,
          'function(context is Context, queries is map) { return { "bounds": evBox3d(context, { "topology": qEverything(EntityType.BODY), "tight": true }), "mass": evApproximateMassProperties(context, { "entities": qEverything(EntityType.BODY) }) }; }',
        ),
      ),
  );

  server.registerTool(
    "onshape_export_stl",
    {
      title: "Export STL",
      description: "Export a Part Studio as a millimeter STL and verify it is non-empty.",
      inputSchema: { ...targetSchema, outputPath: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ outputPath, ...target }) => {
      const stl = await bridgeAndClient().client.exportStl(target);
      if (!stl.includes("solid") || stl.length < 100)
        throw new Error("Onshape returned an empty or invalid STL");
      const path = resolve(outputPath);
      await writeFile(path, stl);
      return textResult({ path, bytes: Buffer.byteLength(stl) });
    },
  );

  return server;
}

export async function startMcpServer(): Promise<void> {
  await createMcpServer().connect(new StdioServerTransport());
}

export interface McpHttpOptions {
  readonly host?: string;
  readonly port?: number;
}

export async function startMcpHttpServer(options: McpHttpOptions = {}): Promise<void> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 27_184;
  if (!["127.0.0.1", "localhost", "::1"].includes(host))
    throw new Error("The CadScript HTTP MCP server only binds to a loopback host");
  if (!Number.isInteger(port) || port < 1 || port > 65_535)
    throw new Error("MCP port must be an integer from 1 through 65535");

  type HttpRequest = IncomingMessage & { body?: unknown };
  type HttpResponse = ServerResponse & {
    status(code: number): HttpResponse;
    json(value: unknown): void;
  };
  const app = createMcpExpressApp({ host });
  app.get("/healthz", (_request: HttpRequest, response: HttpResponse) => {
    response.json({ ok: true, name: "onshape-cadscript", version: CADSCRIPT_VERSION });
  });
  app.post("/mcp", async (request: HttpRequest, response: HttpResponse) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport();
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      void transport.close();
      void server.close();
    };
    response.once("close", close);
    try {
      await server.connect(transport as Parameters<McpServer["connect"]>[0]);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32_603,
            message: error instanceof Error ? error.message : "Internal MCP server error",
          },
          id: null,
        });
      }
    } finally {
      if (response.writableEnded) close();
    }
  });
  app.all("/mcp", (_request: HttpRequest, response: HttpResponse) => {
    response.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32_000, message: "Method not allowed" },
      id: null,
    });
  });

  await new Promise<void>((resolvePromise, reject) => {
    const listener = app.listen(port, host, () => {
      process.stdout.write(`Onshape CadScript MCP listening at http://${host}:${port}/mcp\n`);
    });
    listener.on("error", reject);
    const close = () => listener.close(() => resolvePromise());
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });
}
