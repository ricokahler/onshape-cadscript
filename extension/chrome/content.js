function xsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function selectionRequest(request, sendResponse) {
  const eventName = `__cadscript_selection_result_${request.id}`;
  const handler = (event) => {
    window.removeEventListener(eventName, handler);
    sendResponse({
      id: request.id,
      ok: true,
      status: 200,
      headers: {},
      body: JSON.stringify(event.detail),
    });
  };
  window.addEventListener(eventName, handler, { once: true });
  window.dispatchEvent(
    new CustomEvent("__cadscript_get_selection", { detail: { id: request.id } }),
  );
}

const requests = new Map();

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "cancel") {
    requests.get(request.id)?.abort();
    requests.delete(request.id);
    return false;
  }
  if (request.type === "selection") {
    selectionRequest(request, sendResponse);
    return true;
  }
  if (request.type !== "http") return false;
  (async () => {
    const controller = new AbortController();
    requests.set(request.id, controller);
    try {
      const url = new URL(`/api/v15${request.path}`, "https://cad.onshape.com");
      if (url.origin !== "https://cad.onshape.com" || !url.pathname.startsWith("/api/"))
        throw new Error("Request URL is outside cad.onshape.com/api");
      for (const [key, value] of Object.entries(request.query || {}))
        url.searchParams.set(key, value);
      const method = request.method || "GET";
      if (!["GET", "POST", "DELETE"].includes(method)) throw new Error("Method is not allowed");
      const headers = { Accept: "application/json" };
      if (method !== "GET") {
        const token = xsrfToken();
        if (token) headers["X-XSRF-TOKEN"] = token;
        if (request.body !== undefined) headers["Content-Type"] = "application/json";
      }
      const response = await fetch(url, {
        method,
        headers,
        credentials: "include",
        redirect: "follow",
        signal: controller.signal,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });
      const body = await response.text();
      const responseHeaders = {};
      for (const key of ["content-type", "retry-after"]) {
        const value = response.headers.get(key);
        if (value) responseHeaders[key] = value;
      }
      const retryAfterMs =
        response.status === 429
          ? Number(response.headers.get("retry-after") || 2) * 1000
          : undefined;
      sendResponse({
        id: request.id,
        ok: response.ok,
        status: response.status,
        headers: responseHeaders,
        body,
        ...(retryAfterMs
          ? {
              error: {
                code: "RATE_LIMITED",
                message: "Onshape rate limited the request",
                retryAfterMs,
              },
            }
          : {}),
      });
    } catch (error) {
      sendResponse({
        id: request.id,
        ok: false,
        status: 0,
        headers: {},
        body: "",
        error: { code: "FETCH_ERROR", message: error.message },
      });
    } finally {
      requests.delete(request.id);
    }
  })();
  return true;
});
