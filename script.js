/* Lunchtime Hockey RSVP - Google Sheets Backend */
/* localStorage: 'profile' only (RSVPs + counts stored/read from Google Sheet) */

const API_BASE_URL =
  "https://script.google.com/macros/s/AKfycbxLJ6pHvuaLpE6qekMhS6m4wKLYzQEVTh70os1XTMwiLZqCF_J3EsPs247eVz-OZzQR/exec";

// =========================================================
// WIX RESPONSIVE CUSTOM ELEMENT AUTO-HEIGHT
// =========================================================

const EMBED_HEIGHT_MESSAGE_TYPE =
  "VITE_AUTO_HEIGHT";

(function markEmbedded() {
  if (window.self !== window.top) {
    document.documentElement.classList.add(
      "is-embedded"
    );
  }
})();

(function setupEmbedAutoHeight() {
  if (window.self === window.top) {
    return;
  }

  let lastHeight = 0;
  let rafId = null;

  const timeoutIds = [];

  function getContentHeight() {
    const container =
      document.querySelector(
        ".container"
      );

    if (container) {
      return Math.ceil(
        Math.max(
          container.scrollHeight,
          container.offsetHeight,
          container.getBoundingClientRect()
            .height
        )
      );
    }

    return Math.ceil(
      Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement
          .scrollHeight,
        document.documentElement
          .offsetHeight
      )
    );
  }

  function postHeightNow() {
    rafId = null;

    const height =
      getContentHeight();

    if (!height) {
      return;
    }

    if (
      Math.abs(
        height - lastHeight
      ) < 2
    ) {
      return;
    }

    lastHeight =
      height;

    window.parent.postMessage(
      {
        type:
          EMBED_HEIGHT_MESSAGE_TYPE,

        height,

        pathname:
          window.location.pathname,
      },
      "*"
    );
  }

  function schedulePostHeight() {
    if (rafId !== null) {
      cancelAnimationFrame(
        rafId
      );
    }

    rafId =
      requestAnimationFrame(
        postHeightNow
      );
  }

  window.__reportEmbedHeight =
    schedulePostHeight;

  schedulePostHeight();

  requestAnimationFrame(
    schedulePostHeight
  );

  [
    50,
    100,
    250,
    500,
    1000,
    1500,
    2500,
  ].forEach((delay) => {
    timeoutIds.push(
      window.setTimeout(
        schedulePostHeight,
        delay
      )
    );
  });

  window.addEventListener(
    "load",
    schedulePostHeight
  );

  window.addEventListener(
    "resize",
    schedulePostHeight
  );

  const container =
    document.querySelector(
      ".container"
    );

  if (
    "ResizeObserver" in window
  ) {
    const resizeObserver =
      new ResizeObserver(
        schedulePostHeight
      );

    if (container) {
      resizeObserver.observe(
        container
      );
    } else {
      resizeObserver.observe(
        document.body
      );
    }
  } else if (
    "MutationObserver" in window
  ) {
    const mutationObserver =
      new MutationObserver(
        schedulePostHeight
      );

    mutationObserver.observe(
      container ||
        document.body,
      {
        subtree:
          true,

        childList:
          true,

        attributes:
          true,

        characterData:
          true,
      }
    );
  }

  document
    .querySelectorAll("img")
    .forEach((image) => {
      if (!image.complete) {
        image.addEventListener(
          "load",
          schedulePostHeight
        );

        image.addEventListener(
          "error",
          schedulePostHeight
        );
      }
    });

  if (document.fonts?.ready) {
    document.fonts.ready
      .then(
        schedulePostHeight
      )
      .catch(() => {});
  }
})();

// =========================================================
// DOM ELEMENTS
// =========================================================

const firstNameEl =
  document.getElementById(
    "firstName"
  );

const lastNameEl =
  document.getElementById(
    "lastName"
  );

const positionEl =
  document.getElementById(
    "position"
  );

const saveProfileBtn =
  document.getElementById(
    "saveProfile"
  );

const refreshBtn =
  document.getElementById(
    "refreshBtn"
  );

const eventsContainer =
  document.getElementById(
    "eventsContainer"
  );

// Modal Elements

const attendeesModal =
  document.getElementById(
    "attendeesModal"
  );

const modalCloseBtn =
  document.getElementById(
    "modalCloseBtn"
  );

const modalCloseBtn2 =
  document.getElementById(
    "modalCloseBtn2"
  );

const modalSubtitle =
  document.getElementById(
    "modalSubtitle"
  );

const modalLoading =
  document.getElementById(
    "modalLoading"
  );

const modalEmpty =
  document.getElementById(
    "modalEmpty"
  );

const attendeesList =
  document.getElementById(
    "attendeesList"
  );

let latestSummary = {
  counts: {},
  my: {},
};

let modalLastFocusedEl =
  null;

function sleep(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
  );
}

function buildUrl(
  base,
  params
) {
  const u =
    new URL(base);

  Object.entries(
    params
  ).forEach(
    ([key, value]) => {
      u.searchParams.set(
        key,
        value
      );
    }
  );

  return u.toString();
}

/**
 * Generates Mon/Fri sessions
 * from Sept 11, 2026 through
 * Fri, Nov 13, 2026.
 *
 * IDs are YYYY-MM-DD.
 */
function generateSessions() {
  const start =
    new Date(
      2026,
      8,
      11
    );

  const end =
    new Date(
      2026,
      10,
      13
    );

  const sessions = [];

  for (
    let d =
      new Date(start);
    d <= end;
    d.setDate(
      d.getDate() + 1
    )
  ) {
    const day =
      d.getDay();

    if (
      day !== 1 &&
      day !== 5
    ) {
      continue;
    }

    const id =
      toYmd(d);

    const dateText =
      formatDowMonDay(d);

    const timeText =
      "11:45 AM – 1:15 PM";

    const startTime =
      "11:45";

    sessions.push({
      id,
      dateText,
      timeText,
      startTime,
    });
  }

  return sessions;
}

/**
 * Remove sessions whose
 * start time has passed.
 */
function filterOutPastSessions(
  sessions
) {
  const now =
    new Date();

  return sessions.filter(
    (session) => {
      const start =
        new Date(
          session.id +
            "T" +
            (
              session.startTime ||
              "11:30"
            ) +
            ":00"
        );

      return (
        start.getTime() >=
        now.getTime()
      );
    }
  );
}

function getUpcomingEvents() {
  return filterOutPastSessions(
    generateSessions()
  );
}

function toYmd(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function formatDowMonDay(
  date
) {
  const dow =
    date.toLocaleDateString(
      undefined,
      {
        weekday:
          "short",
      }
    );

  const mon =
    date.toLocaleDateString(
      undefined,
      {
        month:
          "short",
      }
    );

  const day =
    date.getDate();

  return `${dow}, ${mon} ${day}`;
}

// =========================================================
// PROFILE
// =========================================================

function loadProfile() {
  const profile =
    JSON.parse(
      localStorage.getItem(
        "profile"
      ) ||
        "null"
    );

  if (profile) {
    firstNameEl.value =
      profile.first || "";

    lastNameEl.value =
      profile.last || "";

    positionEl.value =
      profile.pos ||
      "Skater";
  }
}

function saveProfile() {
  const first =
    firstNameEl.value.trim();

  const last =
    lastNameEl.value.trim();

  if (
    !first ||
    !last
  ) {
    alert(
      "Please enter both first and last name."
    );

    return;
  }

  const profile = {
    first,
    last,
    pos:
      positionEl.value,
  };

  localStorage.setItem(
    "profile",
    JSON.stringify(
      profile
    )
  );

  alert(
    "Profile saved!"
  );

  renderEvents();
}

function getUserKey(
  profile
) {
  return `${profile.first}_${profile.last}`
    .toLowerCase()
    .replace(
      /\s+/g,
      "_"
    );
}

// =========================================================
// GOOGLE SHEETS API
// =========================================================

async function fetchSummary(
  events
) {
  const profile =
    JSON.parse(
      localStorage.getItem(
        "profile"
      ) ||
        "null"
    );

  const userKey =
    profile
      ? getUserKey(
          profile
        )
      : "";

  const eventIds =
    events
      .map(
        (event) =>
          event.id
      )
      .join(",");

  const url =
    buildUrl(
      API_BASE_URL,
      {
        action:
          "summary",

        eventIds,

        userKey,
      }
    );

  const res =
    await fetch(
      url,
      {
        method:
          "GET",

        redirect:
          "follow",

        cache:
          "no-store",
      }
    );

  if (!res.ok) {
    throw new Error(
      `Summary request failed: ${res.status}`
    );
  }

  const text =
    await res.text();

  let data;

  try {
    data =
      JSON.parse(
        text
      );
  } catch {
    throw new Error(
      `Summary response was not JSON. First 200 chars:\n${text.slice(
        0,
        200
      )}`
    );
  }

  if (!data.ok) {
    throw new Error(
      data.error ||
        "Summary request failed"
    );
  }

  latestSummary =
    data;

  return data;
}

async function setRsvpOnServer(
  eventId,
  attending
) {
  const profile =
    JSON.parse(
      localStorage.getItem(
        "profile"
      ) ||
        "null"
    );

  if (
    !profile ||
    !profile.first ||
    !profile.last
  ) {
    alert(
      "Please save your profile first!"
    );

    return;
  }

  const body =
    new URLSearchParams({
      action:
        "setRsvp",

      eventId,

      userKey:
        getUserKey(
          profile
        ),

      first:
        profile.first,

      last:
        profile.last,

      pos:
        profile.pos,

      attending:
        String(
          !!attending
        ),
    });

  const res =
    await fetch(
      API_BASE_URL,
      {
        method:
          "POST",

        redirect:
          "follow",

        body,
      }
    );

  if (!res.ok) {
    throw new Error(
      `RSVP POST failed: ${res.status}`
    );
  }

  const text =
    await res.text();

  let data;

  try {
    data =
      JSON.parse(
        text
      );
  } catch {
    throw new Error(
      `RSVP response was not JSON. First 200 chars:\n${text.slice(
        0,
        200
      )}`
    );
  }

  if (!data.ok) {
    throw new Error(
      data.error ||
        "RSVP update failed"
    );
  }
}

/**
 * Fetch attendee display list:
 *
 * GET
 * ?action=attendees
 * &eventId=YYYY-MM-DD
 */
async function fetchAttendees(
  eventId
) {
  const url =
    buildUrl(
      API_BASE_URL,
      {
        action:
          "attendees",

        eventId,
      }
    );

  const res =
    await fetch(
      url,
      {
        method:
          "GET",

        redirect:
          "follow",

        cache:
          "no-store",
      }
    );

  if (!res.ok) {
    throw new Error(
      `Attendees request failed: ${res.status}`
    );
  }

  const text =
    await res.text();

  let data;

  try {
    data =
      JSON.parse(
        text
      );
  } catch {
    throw new Error(
      `Attendees response was not JSON. First 200 chars:\n${text.slice(
        0,
        200
      )}`
    );
  }

  if (!data.ok) {
    throw new Error(
      data.error ||
        "Attendees request failed"
    );
  }

  return (
    data.attendees ||
    []
  );
}

// =========================================================
// EVENTS
// =========================================================

async function renderEvents() {
  const EVENTS =
    getUpcomingEvents();

  if (
    EVENTS.length === 0
  ) {
    eventsContainer.innerHTML =
      `
        <div class="event-card">
          No upcoming sessions right now.
        </div>
      `;

    window
      .__reportEmbedHeight?.();

    return;
  }

  eventsContainer.innerHTML =
    `
      <div class="event-card">
        Loading sessions...
      </div>
    `;

  window
    .__reportEmbedHeight?.();

  let summary;

  try {
    summary =
      await fetchSummary(
        EVENTS
      );
  } catch (err) {
    eventsContainer.innerHTML =
      `
        <div class="event-card">
          Error loading counts:
          ${escapeHtml(
            String(err)
          )}
        </div>
      `;

    window
      .__reportEmbedHeight?.();

    return;
  }

  const profile =
    JSON.parse(
      localStorage.getItem(
        "profile"
      ) ||
        "null"
    );

  const userKey =
    profile
      ? getUserKey(
          profile
        )
      : null;

  eventsContainer.innerHTML =
    EVENTS.map(
      (event) => {
        const counts =
          summary.counts?.[
            event.id
          ] || {
            skaters:
              0,

            goalies:
              0,
          };

        const myInfo =
          userKey
            ? (
                summary.my?.[
                  event.id
                ] || {
                  attending:
                    false,
                }
              )
            : null;

        const isAttending =
          myInfo
            ? !!myInfo.attending
            : false;

        const statusText =
          profile
            ? (
                isAttending
                  ? "✓ You are attending"
                  : "Not signed up"
              )
            : "Save profile to RSVP";

        const btnText =
          isAttending
            ? "Cancel RSVP"
            : "RSVP Yes";

        const btnClass =
          isAttending
            ? "btn btn-cancel"
            : "btn";

        return `
          <div class="event-card">
            <div class="event-date">
              <span class="event-date-text">
                ${escapeHtml(
                  event.dateText
                )}
              </span>

              <span class="event-time-text">
                •
                ${escapeHtml(
                  event.timeText
                )}
              </span>
            </div>

            <div class="event-counts">
              Skaters:
              <span>
                ${counts.skaters}
              </span>

              |

              Goalies:
              <span>
                ${counts.goalies}
              </span>
            </div>

            <div class="my-status">
              ${escapeHtml(
                statusText
              )}
            </div>

            <div class="event-actions">
              <button
                class="${btnClass}"
                data-event-id="${event.id}"
                data-action="rsvp"
                type="button"
              >
                ${btnText}
              </button>

              <button
                class="btn btn-outline"
                data-event-id="${event.id}"
                data-action="view"
                type="button"
              >
                View Players
              </button>
            </div>
          </div>
        `;
      }
    ).join("");

  eventsContainer
    .querySelectorAll(
      "button[data-event-id]"
    )
    .forEach(
      (btn) => {
        btn.addEventListener(
          "click",
          async () => {
            const eventId =
              btn.getAttribute(
                "data-event-id"
              );

            const action =
              btn.getAttribute(
                "data-action"
              );

            if (
              action ===
              "rsvp"
            ) {
              await toggleRsvp(
                eventId
              );
            } else if (
              action ===
              "view"
            ) {
              const ev =
                EVENTS.find(
                  (event) =>
                    event.id ===
                    eventId
                );

              const subtitle =
                ev
                  ? `${ev.dateText} • ${ev.timeText}`
                  : eventId;

              await openAttendeesModal(
                eventId,
                subtitle
              );
            }
          }
        );
      }
    );

  window
    .__reportEmbedHeight?.();
}

async function toggleRsvp(
  eventId
) {
  const profile =
    JSON.parse(
      localStorage.getItem(
        "profile"
      ) ||
        "null"
    );

  if (
    !profile ||
    !profile.first ||
    !profile.last
  ) {
    alert(
      "Please save your profile first!"
    );

    return;
  }

  const currentlyAttending =
    !!latestSummary
      .my?.[
        eventId
      ]?.attending;

  const nextAttending =
    !currentlyAttending;

  setAllEventButtonsEnabled(
    false
  );

  try {
    await setRsvpOnServer(
      eventId,
      nextAttending
    );

    await sleep(
      350
    );

    await renderEvents();
  } catch (err) {
    alert(
      `RSVP update failed: ${String(
        err
      )}`
    );
  } finally {
    setAllEventButtonsEnabled(
      true
    );

    window
      .__reportEmbedHeight?.();
  }
}

function setAllEventButtonsEnabled(
  enabled
) {
  eventsContainer
    .querySelectorAll(
      "button[data-event-id]"
    )
    .forEach(
      (button) => {
        button.disabled =
          !enabled;

        button.style.opacity =
          enabled
            ? "1"
            : "0.7";

        button.style.cursor =
          enabled
            ? "pointer"
            : "not-allowed";
      }
    );
}

// =========================================================
// MODAL
// =========================================================

function showModal() {
  attendeesModal.classList.add(
    "is-open"
  );

  attendeesModal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );

  window
    .__reportEmbedHeight?.();
}

function hideModal() {
  attendeesModal.classList.remove(
    "is-open"
  );

  attendeesModal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "modal-open"
  );

  if (
    modalLastFocusedEl &&
    typeof modalLastFocusedEl.focus ===
      "function"
  ) {
    modalLastFocusedEl.focus();
  }

  modalLastFocusedEl =
    null;

  window
    .__reportEmbedHeight?.();
}

function resetModalContent() {
  modalLoading.style.display =
    "block";

  modalEmpty.style.display =
    "none";

  attendeesList.innerHTML =
    "";

  window
    .__reportEmbedHeight?.();
}

async function openAttendeesModal(
  eventId,
  subtitleText
) {
  modalLastFocusedEl =
    document.activeElement;

  modalSubtitle.textContent =
    subtitleText;

  resetModalContent();

  showModal();

  try {
    const attendees =
      await fetchAttendees(
        eventId
      );

    modalLoading.style.display =
      "none";

    if (
      !attendees.length
    ) {
      modalEmpty.style.display =
        "block";

      window
        .__reportEmbedHeight?.();

      return;
    }

    attendeesList.innerHTML =
      attendees
        .map(
          (attendee) => {
            const pos =
              String(
                attendee.pos ||
                  ""
              ).toLowerCase() ===
              "goalie"
                ? "Goalie"
                : "Skater";

            const display =
              String(
                attendee.display ||
                  ""
              ).trim() ||
              "Player";

            return `
              <li class="attendee-row">
                <span class="attendee-name">
                  ${escapeHtml(
                    display
                  )}
                </span>

                <span
                  class="attendee-pill ${
                    pos ===
                    "Goalie"
                      ? "pill-goalie"
                      : "pill-skater"
                  }"
                >
                  ${pos}
                </span>
              </li>
            `;
          }
        )
        .join("");

    window
      .__reportEmbedHeight?.();
  } catch (err) {
    modalLoading.style.display =
      "none";

    modalEmpty.style.display =
      "block";

    modalEmpty.textContent =
      `Could not load players: ${String(
        err
      )}`;

    window
      .__reportEmbedHeight?.();
  }
}

// Modal close buttons

modalCloseBtn.addEventListener(
  "click",
  hideModal
);

modalCloseBtn2.addEventListener(
  "click",
  hideModal
);

// Click outside modal closes it

attendeesModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      attendeesModal
    ) {
      hideModal();
    }
  }
);

// Escape closes modal

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key ===
        "Escape" &&
      attendeesModal.classList.contains(
        "is-open"
      )
    ) {
      hideModal();
    }
  }
);

// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHtml(
  str
) {
  return String(str)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadProfile();

    renderEvents();

    saveProfileBtn.addEventListener(
      "click",
      saveProfile
    );

    refreshBtn.addEventListener(
      "click",
      renderEvents
    );

    window
      .__reportEmbedHeight?.();
  }
);