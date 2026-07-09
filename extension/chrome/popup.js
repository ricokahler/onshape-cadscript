chrome.runtime.sendMessage({ type: "popup-status" }, (status) => {
  const host = document.querySelector("#host");
  host.textContent = status?.connected ? "Connected" : "Not connected";
  host.className = status?.connected ? "ok" : "bad";
  document.querySelector("#tabs").textContent = String(status?.onshapeTabs ?? 0);
  document.querySelector("#requests").textContent = String(status?.requestCount ?? 0);
});
