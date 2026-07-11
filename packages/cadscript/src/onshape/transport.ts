export interface TransportRequest {
  readonly method?: "GET" | "POST" | "DELETE";
  readonly path: string;
  /**
   * Onshape keeps the long-standing Part Studio STL endpoint on API v9 while
   * CadScript's feature APIs use the current v15 surface.
   */
  readonly apiVersion?: 9 | 15;
  readonly query?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly responseType?: "json" | "text" | "binary";
  readonly signal?: AbortSignal;
}

export interface TransportResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface OnshapeTransport {
  request(request: TransportRequest): Promise<TransportResponse>;
}
