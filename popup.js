const connectView = document.getElementById("connect-view");
const dashboardView = document.getElementById("dashboard-view");
const connectForm = document.getElementById("connect-form");
const serverInput = document.getElementById("server-input");
const passwordInput = document.getElementById("password-input");
const connectButton = document.getElementById("connect-button");
const cancelSettingsButton = document.getElementById("cancel-settings");
const toggleButton = document.getElementById("toggle-button");
const refreshButton = document.getElementById("refresh-button");
const settingsButton = document.getElementById("settings-button");
const message = document.getElementById("message");
const connectionLabel = document.getElementById("connection-label");
const adminLink = document.getElementById("admin-link");

let activeSession = null;
let blockingEnabled = false;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("is-error", isError);
}

function showConnectView(isChangingConnection = false) {
  connectView.hidden = false;
  dashboardView.hidden = true;
  cancelSettingsButton.hidden = !isChangingConnection;
  passwordInput.value = "";
  passwordInput.focus();
}

function showDashboardView() {
  connectView.hidden = true;
  dashboardView.hidden = false;
  cancelSettingsButton.hidden = true;
}

function normalizeServer(value) {
  const entered = value.trim();
  if (!entered) {
    throw new Error("Enter a valid HTTP or HTTPS Pi-hole address.");
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(entered) ? entered : `http://${entered}`;
  let address;
  try {
    address = new URL(candidate);
  } catch {
    throw new Error("Enter a valid HTTP or HTTPS Pi-hole address.");
  }

  if (!(address.protocol === "http:" || address.protocol === "https:") || address.username || address.password || address.search || address.hash || (address.pathname && address.pathname !== "/")) {
    throw new Error("Enter a valid HTTP or HTTPS Pi-hole address.");
  }

  return address.origin;
}

async function ensureHostPermission(server) {
  const origin = `${new URL(server).origin}/*`;
  const permission = { origins: [origin] };
  if (!(await chrome.permissions.request(permission))) {
    throw new Error("Allow access to this Pi-hole address to continue.");
  }
}

async function parseResponse(response) {
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Pi-hole returned an unreadable response.");
    }
  }
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `Pi-hole returned HTTP ${response.status}.`);
  }
  return data;
}

async function authenticate(server, password) {
  const response = await fetch(`${server}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ password })
  });
  const data = await parseResponse(response);
  const session = data.session || data;
  if (!session.sid) {
    throw new Error("Pi-hole did not return a session. Check the password and API access.");
  }
  return { server, sid: session.sid, csrf: session.csrf || "" };
}

async function apiRequest(path, options = {}) {
  const headers = {
    Accept: "application/json",
    "X-FTL-SID": activeSession.sid,
    ...options.headers
  };
  if (activeSession.csrf) {
    headers["X-FTL-CSRF"] = activeSession.csrf;
  }
  const response = await fetch(`${activeSession.server}${path}`, { ...options, headers });
  return parseResponse(response);
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat().format(number) : "--";
}

function setBlockingState(enabled) {
  blockingEnabled = Boolean(enabled);
  document.getElementById("blocking-label").textContent = blockingEnabled ? "Protection is on" : "Protection is paused";
  document.getElementById("blocking-detail").textContent = blockingEnabled
    ? "DNS requests are being filtered"
    : "DNS requests are currently not being filtered";
  document.getElementById("status-indicator").className = `status-indicator ${blockingEnabled ? "is-on" : "is-off"}`;
  toggleButton.textContent = blockingEnabled ? "Pause protection" : "Resume protection";
  toggleButton.classList.toggle("is-pause", blockingEnabled);
  toggleButton.disabled = false;
}

async function refreshDashboard() {
  toggleButton.disabled = true;
  refreshButton.disabled = true;
  showMessage("Refreshing Pi-hole status...");
  try {
    const [summary, blocking] = await Promise.all([
      apiRequest("/api/stats/summary"),
      apiRequest("/api/dns/blocking")
    ]);
    const queries = summary.queries || {};
    const gravity = summary.gravity || {};
    document.getElementById("queries-value").textContent = formatNumber(queries.total);
    document.getElementById("blocked-value").textContent = formatNumber(queries.blocked);
    document.getElementById("percent-value").textContent = Number.isFinite(Number(queries.percent_blocked))
      ? `${Number(queries.percent_blocked).toFixed(1)}%`
      : "--";
    document.getElementById("domains-value").textContent = formatNumber(gravity.domains_being_blocked);
    setBlockingState(blocking.blocking);
    showDashboardView();
    showMessage("Connected to Pi-hole.");
  } finally {
    refreshButton.disabled = false;
    if (activeSession) {
      toggleButton.disabled = false;
    }
  }
}

connectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  connectButton.disabled = true;
  showMessage("Connecting...");
  try {
    const server = normalizeServer(serverInput.value);
    await ensureHostPermission(server);
    activeSession = await authenticate(server, passwordInput.value);
    await chrome.storage.local.set({ server });
    await chrome.storage.session.set({ piHoleSession: activeSession });
    passwordInput.value = "";
    connectionLabel.textContent = new URL(server).host;
    adminLink.href = `${server}/admin/`;
    await refreshDashboard();
  } catch (error) {
    activeSession = null;
    await chrome.storage.session.remove("piHoleSession");
    showConnectView();
    showMessage(error.message || "Unable to connect to Pi-hole.", true);
  } finally {
    connectButton.disabled = false;
  }
});

toggleButton.addEventListener("click", async () => {
  toggleButton.disabled = true;
  showMessage(blockingEnabled ? "Pausing DNS protection..." : "Resuming DNS protection...");
  try {
    await apiRequest("/api/dns/blocking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocking: !blockingEnabled, timer: 0 })
    });
    await refreshDashboard();
  } catch (error) {
    toggleButton.disabled = false;
    showMessage(error.message || "Could not change blocking status.", true);
  }
});

refreshButton.addEventListener("click", async () => {
  try {
    await refreshDashboard();
  } catch (error) {
    showMessage(error.message || "Could not refresh Pi-hole status.", true);
  }
});

settingsButton.addEventListener("click", () => {
  showConnectView(true);
  showMessage("Enter the address and password for the Pi-hole you want to use.");
});

cancelSettingsButton.addEventListener("click", () => {
  showDashboardView();
  showMessage("Connected to Pi-hole.");
});

async function initialize() {
  const [{ server }, { piHoleSession }] = await Promise.all([
    chrome.storage.local.get("server"),
    chrome.storage.session.get("piHoleSession")
  ]);
  if (server) {
    serverInput.value = server;
  }
  if (!piHoleSession?.sid || !piHoleSession?.server) {
    showConnectView();
    return;
  }
  activeSession = piHoleSession;
  connectionLabel.textContent = new URL(activeSession.server).host;
  adminLink.href = `${activeSession.server}/admin/`;
  try {
    await refreshDashboard();
  } catch (error) {
    activeSession = null;
    await chrome.storage.session.remove("piHoleSession");
    showConnectView();
    showMessage(`${error.message || "Session expired."} Sign in again.`, true);
  }
}

initialize().catch((error) => {
  showConnectView();
  showMessage(error.message || "Unable to load extension settings.", true);
});