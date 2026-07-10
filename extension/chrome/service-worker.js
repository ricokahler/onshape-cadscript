const HOST_NAME = "com.ricokahler.onshape_cadscript";
let nativePort;
let requestCount = 0;

function setBadge(connected) {
  chrome.action.setBadgeBackgroundColor({ color: connected ? "#16a34a" : "#dc2626" });
  chrome.action.setBadgeText({ text: connected ? "ON" : "" });
}

function scoreTab(tab, request) {
  const url = tab.url || "";
  const documentId = request.path?.match(/\/d\/([^/]+)/)?.[1];
  const workspaceId = request.path?.match(/\/w\/([^/]+)/)?.[1];
  const elementId = request.path?.match(/\/e\/([^/?]+)/)?.[1];
  return (
    (tab.discarded ? 0 : 100) +
    (tab.status === "complete" ? 20 : 0) +
    (tab.active ? 10 : 0) +
    (documentId && url.includes(`/documents/${documentId}`) ? 1000 : 0) +
    (workspaceId && url.includes(`/w/${workspaceId}`) ? 100 : 0) +
    (elementId && url.includes(`/e/${elementId}`) ? 100 : 0)
  );
}

async function forward(request) {
  if (request.type === "cancel") {
    const tabs = await chrome.tabs.query({ url: "https://cad.onshape.com/*" });
    await Promise.allSettled(tabs.map((tab) => chrome.tabs.sendMessage(tab.id, request)));
    return;
  }
  requestCount += 1;
  const tabs = await chrome.tabs.query({ url: "https://cad.onshape.com/*" });
  if (request.type === "health") {
    return {
      id: request.id,
      ok: true,
      status: 200,
      headers: {},
      body: JSON.stringify({
        protocolVersion: request.protocolVersion,
        extensionVersion: chrome.runtime.getManifest().version,
        onshapeTabCount: tabs.length,
        requestCount,
      }),
    };
  }
  if (tabs.length === 0)
    throw new Error("Open an Onshape document in Chrome before using CadScript");
  const tab = [...tabs].sort((a, b) => scoreTab(b, request) - scoreTab(a, request))[0];
  return chrome.tabs.sendMessage(tab.id, request);
}

function connect() {
  if (nativePort) return;
  try {
    const port = chrome.runtime.connectNative(HOST_NAME);
    nativePort = port;
    setBadge(true);
    port.onMessage.addListener(async (request) => {
      try {
        const response = await forward(request);
        if (response) port.postMessage(response);
      } catch (error) {
        port.postMessage({
          id: request.id,
          ok: false,
          status: 0,
          headers: {},
          body: "",
          error: { code: "EXTENSION_ERROR", message: error.message },
        });
      }
    });
    port.onDisconnect.addListener(() => {
      if (nativePort === port) {
        nativePort = undefined;
        setBadge(false);
      }
    });
  } catch {
    nativePort = undefined;
    setBadge(false);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "popup-status") return false;
  chrome.tabs
    .query({ url: "https://cad.onshape.com/*" })
    .then((tabs) =>
      sendResponse({ connected: Boolean(nativePort), onshapeTabs: tabs.length, requestCount }),
    );
  return true;
});

chrome.runtime.onInstalled.addListener(connect);
chrome.runtime.onStartup.addListener(connect);
connect();
