/* Lunchtime Hockey RSVP - Google Sheets Backend */
/* localStorage: 'profile' only (RSVPs + counts stored/read from Google Sheet) */

const API_BASE_URL = "https://script.google.com/macros/s/AKfycbxArH1_li3v-36MttNouoDcF4Pm-1IhFR1aEvaMRfkOUJVjr5CKSznGSDEP12-ZqkTH/exec";

// DOM Elements
const firstNameEl = document.getElementById("firstName");
const lastNameEl = document.getElementById("lastName");
const positionEl = document.getElementById("position");
const saveProfileBtn = document.getElementById("saveProfile");
const refreshBtn = document.getElementById("refreshBtn");
const eventsContainer = document.getElementById("eventsContainer");

let latestSummary = { counts: {}, my: {} };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(base, params) {
  const u = new URL(base);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

/**
 * Generates Tue/Thu sessions for Feb+Mar 2026.
 * IDs are YYYY-MM-DD (matches Sheets).
 */
function generateSessions() {
  const start = new Date(2026, 1, 1);  // Feb 1, 2026
  const end = new Date(2026, 3, 1);    // Apr 1, 2026 (exclusive)

  const sessions = [];
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay(); // 0=Sun, 2=Tue, 4=Thu
    if (day !== 2 && day !== 4) continue;

    const id = toYmd(d);

    // ✅ Split label parts so we can color date only
    const dateText = formatDowMonDay(d); // "Tue, Feb 3"
    const timeText = "11:30 AM – 1:00 PM";

    sessions.push({ id, dateText, timeText });
  }
  return sessions;
}

/**
 * Remove sessions whose start time (11:30 AM) has passed.
 */
function filterOutPastSessions(sessions) {
  const now = new Date();
  return sessions.filter((s) => {
    const start = new Date(s.id + "T11:30:00");
    return start.getTime() >= now.getTime();
  });
}

function getUpcomingEvents() {
  return filterOutPastSessions(generateSessions());
}

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDowMonDay(date) {
  const dow = date.toLocaleDateString(undefined, { weekday: "short" });
  const mon = date.toLocaleDateString(undefined, { month: "short" });
  const day = date.getDate();
  return `${dow}, ${mon} ${day}`;
}

// Load profile from localStorage into form inputs
function loadProfile() {
  const profile = JSON.parse(localStorage.getItem("profile") || "null");
  if (profile) {
    firstNameEl.value = profile.first || "";
    lastNameEl.value = profile.last || "";
    positionEl.value = profile.pos || "Skater";
  }
}

// Save profile to localStorage
function saveProfile() {
  const first = firstNameEl.value.trim();
  const last = lastNameEl.value.trim();
  if (!first || !last) {
    alert("Please enter both first and last name.");
    return;
  }
  const profile = { first, last, pos: positionEl.value };
  localStorage.setItem("profile", JSON.stringify(profile));
  alert("Profile saved!");
  renderEvents();
}

function getUserKey(profile) {
  return `${profile.first}_${profile.last}`.toLowerCase().replace(/\s+/g, "_");
}

// Fetch counts + my status for all upcoming events from Google Sheets
async function fetchSummary(events) {
  const profile = JSON.parse(localStorage.getItem("profile") || "null");
  const userKey = profile ? getUserKey(profile) : "";

  const eventIds = events.map((e) => e.id).join(",");

  const url = buildUrl(API_BASE_URL, {
    action: "summary",
    eventIds,
    userKey,
  });

  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Summary request failed: ${res.status}`);

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Summary response was not JSON. First 200 chars:\n${text.slice(0, 200)}`);
  }

  if (!data.ok) throw new Error(data.error || "Summary request failed");

  latestSummary = data;
  return data;
}

async function setRsvpOnServer(eventId, attending) {
  const profile = JSON.parse(localStorage.getItem("profile") || "null");
  if (!profile || !profile.first || !profile.last) {
    alert("Please save your profile first!");
    return;
  }

  const body = new URLSearchParams({
    action: "setRsvp",
    eventId,
    userKey: getUserKey(profile),
    first: profile.first,
    last: profile.last,
    pos: profile.pos,
    attending: String(!!attending),
  });

  const res = await fetch(API_BASE_URL, {
    method: "POST",
    redirect: "follow",
    body,
  });

  if (!res.ok) throw new Error(`RSVP POST failed: ${res.status}`);

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`RSVP response was not JSON. First 200 chars:\n${text.slice(0, 200)}`);
  }

  if (!data.ok) throw new Error(data.error || "RSVP update failed");
}

// Render all event cards with server counts and RSVP buttons
async function renderEvents() {
  const EVENTS = getUpcomingEvents();

  if (EVENTS.length === 0) {
    eventsContainer.innerHTML = `<div class="event-card">No upcoming sessions right now.</div>`;
    return;
  }

  eventsContainer.innerHTML = `<div class="event-card">Loading sessions...</div>`;

  let summary;
  try {
    summary = await fetchSummary(EVENTS);
  } catch (err) {
    eventsContainer.innerHTML = `<div class="event-card">Error loading counts: ${String(err)}</div>`;
    return;
  }

  const profile = JSON.parse(localStorage.getItem("profile") || "null");
  const userKey = profile ? getUserKey(profile) : null;

  eventsContainer.innerHTML = EVENTS.map((event) => {
    const counts = summary.counts?.[event.id] || { skaters: 0, goalies: 0 };
    const myInfo = userKey ? (summary.my?.[event.id] || { attending: false }) : null;
    const isAttending = myInfo ? !!myInfo.attending : false;

    const statusText = profile
      ? (isAttending ? "✓ You are attending" : "Not signed up")
      : "Save profile to RSVP";

    const btnText = isAttending ? "Cancel RSVP" : "RSVP Yes";
    const btnClass = isAttending ? "btn btn-cancel" : "btn";

    return `
      <div class="event-card">
        <div class="event-date">
          <span class="event-date-text">${event.dateText}</span>
          <span class="event-time-text"> • ${event.timeText}</span>
        </div>
        <div class="event-counts">
          Skaters: <span>${counts.skaters}</span> | Goalies: <span>${counts.goalies}</span>
        </div>
        <div class="my-status">${statusText}</div>
        <button class="${btnClass}" data-event-id="${event.id}">
          ${btnText}
        </button>
      </div>
    `;
  }).join("");

  eventsContainer.querySelectorAll("button[data-event-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const eventId = btn.getAttribute("data-event-id");
      await toggleRsvp(eventId);
    });
  });
}

async function toggleRsvp(eventId) {
  const profile = JSON.parse(localStorage.getItem("profile") || "null");
  if (!profile || !profile.first || !profile.last) {
    alert("Please save your profile first!");
    return;
  }

  const currentlyAttending = !!(latestSummary.my?.[eventId]?.attending);
  const nextAttending = !currentlyAttending;

  setAllRsvpButtonsEnabled(false);

  try {
    await setRsvpOnServer(eventId, nextAttending);
    await sleep(350);
    await renderEvents();
  } catch (err) {
    alert(`RSVP update failed: ${String(err)}`);
  } finally {
    setAllRsvpButtonsEnabled(true);
  }
}

function setAllRsvpButtonsEnabled(enabled) {
  eventsContainer.querySelectorAll("button[data-event-id]").forEach((b) => {
    b.disabled = !enabled;
    b.style.opacity = enabled ? "1" : "0.7";
    b.style.cursor = enabled ? "pointer" : "not-allowed";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
  renderEvents();
  saveProfileBtn.addEventListener("click", saveProfile);
  refreshBtn.addEventListener("click", renderEvents);
});
