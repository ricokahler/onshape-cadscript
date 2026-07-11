export interface TransportRequest {
  readonly method?: "GET" | "POST" | "DELETE";
  readonly path: string;
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
