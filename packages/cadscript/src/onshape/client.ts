import type { OnshapeTarget } from "../runtime/project.js";
import type { OnshapeTransport, TransportRequest } from "./transport.js";

export interface FeatureNotice {
  readonly level: string;
  readonly message: string;
}

export interface ObservedFeature {
  readonly featureId: string;
  readonly name: string;
  readonly featureType: string;
  readonly status: string;
  readonly notices: readonly FeatureNotice[];
  readonly definition: Record<string, unknown>;
}

export interface PartStudioObservation {
  readonly microversionId: string;
  readonly features: readonly ObservedFeature[];
}

export interface RenderOptions {
  readonly view?: "isometric" | "top" | "bottom" | "front" | "back" | "left" | "right" | string;
  readonly width?: number;
  readonly height?: number;
}

const VIEW_MATRICES: Record<string, string> = {
  isometric: "0.612,0.612,0,0,-0.354,0.354,0.707,0,0.707,-0.707,0.707,0",
  top: "top",
  bottom: "bottom",
  front: "front",
  back: "back",
  left: "left",
  right: "right",
};

export class OnshapeClient {
  constructor(private readonly transport: OnshapeTransport) {}

  private async call<T>(request: TransportRequest): Promise<T> {
    const response = await this.transport.request(request);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Onshape API ${response.status} ${request.method ?? "GET"} ${request.path}: ${response.body.slice(0, 500)}`,
      );
    }
    if (response.status === 204 || !response.body) return undefined as T;
    if (request.responseType === "text" || request.responseType === "binary")
      return response.body as T;
    return JSON.parse(response.body) as T;
  }

  private base(target: OnshapeTarget): string {
    return `/partstudios/d/${target.documentId}/w/${target.workspaceId}/e/${target.elementId}`;
  }

  async listDocuments(query?: string): Promise<unknown> {
    return this.call({ path: "/documents", ...(query ? { query: { q: query } } : {}) });
  }

  async listElements(documentId: string, workspaceId: string): Promise<unknown> {
    return this.call({ path: `/documents/d/${documentId}/w/${workspaceId}/elements` });
  }

  async createDocument(name: string, isPublic = false): Promise<Record<string, unknown>> {
    return this.call({ method: "POST", path: "/documents", body: { name, isPublic } });
  }

  async createPartStudio(
    documentId: string,
    workspaceId: string,
    name: string,
  ): Promise<Record<string, unknown>> {
    return this.call({
      method: "POST",
      path: `/partstudios/d/${documentId}/w/${workspaceId}`,
      body: { name },
    });
  }

  async observe(target: OnshapeTarget): Promise<PartStudioObservation> {
    const data = await this.call<Record<string, unknown>>({
      path: `${this.base(target)}/features`,
    });
    const states = (data.featureStates ?? {}) as Record<string, Record<string, unknown>>;
    const features = ((data.features ?? []) as Record<string, unknown>[]).map(
      (feature): ObservedFeature => {
        const featureId = String(feature.featureId ?? "");
        const state = states[featureId] ?? {};
        return {
          featureId,
          name: String(feature.name ?? ""),
          featureType: String(feature.featureType ?? feature.btType ?? ""),
          status: String(state.featureStatus ?? "ok"),
          notices: ((state.notices ?? []) as Record<string, unknown>[]).map((notice) => ({
            level: String(notice.level ?? ""),
            message: String(notice.message ?? ""),
          })),
          definition: feature,
        };
      },
    );
    const microversionId = String(
      data.sourceMicroversion ?? data.microversionId ?? data.serializationVersion ?? "unknown",
    );
    return { microversionId, features };
  }

  async addFeature(
    target: OnshapeTarget,
    definition: Record<string, unknown>,
  ): Promise<{ featureId: string; status: string; notices: FeatureNotice[] }> {
    const data = await this.call<Record<string, unknown>>({
      method: "POST",
      path: `${this.base(target)}/features`,
      body: definition,
    });
    return this.parseMutation(data);
  }

  async updateFeature(
    target: OnshapeTarget,
    featureId: string,
    definition: Record<string, unknown>,
  ): Promise<{ featureId: string; status: string; notices: FeatureNotice[] }> {
    const body = structuredClone(definition);
    const feature = (body.feature ?? {}) as Record<string, unknown>;
    feature.featureId = featureId;
    body.feature = feature;
    const data = await this.call<Record<string, unknown>>({
      method: "POST",
      path: `${this.base(target)}/features/featureid/${featureId}`,
      body,
    });
    return this.parseMutation(data);
  }

  async deleteFeature(target: OnshapeTarget, featureId: string): Promise<void> {
    await this.call({
      method: "DELETE",
      path: `${this.base(target)}/features/featureid/${featureId}`,
    });
  }

  async createCheckpoint(target: OnshapeTarget, name: string): Promise<unknown> {
    return this.call({
      method: "POST",
      path: `/documents/d/${target.documentId}/versions`,
      body: {
        documentId: target.documentId,
        workspaceId: target.workspaceId,
        name,
        description: "Created automatically before CadScript replaces features.",
      },
    });
  }

  async render(target: OnshapeTarget, options: RenderOptions = {}): Promise<string[]> {
    const view = options.view ?? "isometric";
    const data = await this.call<{ images: string[] }>({
      path: `${this.base(target)}/shadedviews`,
      query: {
        outputWidth: String(options.width ?? 1000),
        outputHeight: String(options.height ?? 750),
        pixelSize: "0",
        viewMatrix: VIEW_MATRICES[view] ?? view,
        useAntiAliasing: "true",
      },
    });
    return data.images;
  }

  async evaluateFeatureScript(target: OnshapeTarget, script: string): Promise<unknown> {
    return this.call({
      method: "POST",
      path: `${this.base(target)}/featurescript`,
      body: { script, queries: {} },
    });
  }

  async exportStl(target: OnshapeTarget): Promise<string> {
    return this.call({
      path: `${this.base(target)}/stl`,
      query: { mode: "text", units: "millimeter" },
      responseType: "text",
    });
  }

  private parseMutation(data: Record<string, unknown>): {
    featureId: string;
    status: string;
    notices: FeatureNotice[];
  } {
    const feature = (data.feature ?? {}) as Record<string, unknown>;
    const state = (data.featureState ?? {}) as Record<string, unknown>;
    return {
      featureId: String(feature.featureId ?? ""),
      status: String(state.featureStatus ?? "ok"),
      notices: ((state.notices ?? []) as Record<string, unknown>[]).map((notice) => ({
        level: String(notice.level ?? ""),
        message: String(notice.message ?? ""),
      })),
    };
  }
}

export function assertHealthyFeature(
  feature: { status: string; notices: readonly FeatureNotice[] },
  name: string,
): void {
  const badNotices = feature.notices.filter((notice) =>
    ["ERROR", "WARNING"].includes(notice.level.toUpperCase()),
  );
  if (feature.status.toLowerCase() !== "ok" || badNotices.length) {
    const details = badNotices.map((notice) => `${notice.level}: ${notice.message}`).join("; ");
    throw new Error(
      `Onshape feature ${name} did not regenerate cleanly${details ? `: ${details}` : ` (${feature.status})`}`,
    );
  }
}
