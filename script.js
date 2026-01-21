/* Lunchtime Hockey RSVP - JavaScript Logic */
/* localStorage: 'profile' and 'rsvps' keys */

// Hardcoded upcoming events (5 sessions starting tomorrow)
const EVENTS = [
  { id: '2026-01-22', label: 'Thu, Jan 22 - 12:00 PM' },
  { id: '2026-01-23', label: 'Fri, Jan 23 - 12:00 PM' },
  { id: '2026-01-24', label: 'Sat, Jan 24 - 12:00 PM' },
  { id: '2026-01-27', label: 'Mon, Jan 27 - 12:00 PM' },
  { id: '2026-01-28', label: 'Tue, Jan 28 - 12:00 PM' }
];

// DOM Elements
const firstNameEl = document.getElementById('firstName');
const lastNameEl = document.getElementById('lastName');
const positionEl = document.getElementById('position');
const saveProfileBtn = document.getElementById('saveProfile');
const refreshBtn = document.getElementById('refreshBtn');
const eventsContainer = document.getElementById('eventsContainer');

// Load profile from localStorage into form inputs
function loadProfile() {
  const profile = JSON.parse(localStorage.getItem('profile') || 'null');
  if (profile) {
    firstNameEl.value = profile.first || '';
    lastNameEl.value = profile.last || '';
    positionEl.value = profile.pos || 'Skater';
  }
}

// Save profile to localStorage
function saveProfile() {
  const first = firstNameEl.value.trim();
  const last = lastNameEl.value.trim();
  if (!first || !last) { alert('Please enter both first and last name.'); return; }
  const profile = { first, last, pos: positionEl.value };
  localStorage.setItem('profile', JSON.stringify(profile));
  alert('Profile saved!');
  renderEvents();
}

// Get all RSVPs object from localStorage
function getRsvps() {
  return JSON.parse(localStorage.getItem('rsvps') || '{}');
}

// Save RSVPs object to localStorage
function saveRsvps(rsvps) {
  localStorage.setItem('rsvps', JSON.stringify(rsvps));
}

// Generate unique key for user (lowercase first_last)
function getUserKey(profile) {
  return `${profile.first}_${profile.last}`.toLowerCase().replace(/\s+/g, '_');
}

// Render all event cards with tallies and RSVP buttons
function renderEvents() {
  const profile = JSON.parse(localStorage.getItem('profile') || 'null');
  const rsvps = getRsvps();
  const userKey = profile ? getUserKey(profile) : null;

  eventsContainer.innerHTML = EVENTS.map(event => {
    const eventRsvps = rsvps[event.id] || {};
    // Tally skaters and goalies who are attending
    let skaters = 0, goalies = 0;
    Object.values(eventRsvps).forEach(r => {
      if (r.attending) r.pos === 'Goalie' ? goalies++ : skaters++;
    });
    // Check if current user is attending this event
    const myRsvp = userKey ? eventRsvps[userKey] : null;
    const isAttending = myRsvp?.attending || false;
    const statusText = profile ? (isAttending ? '✓ You are attending' : 'Not signed up') : 'Save profile to RSVP';
    const btnText = isAttending ? 'Cancel RSVP' : 'RSVP Yes';
    const btnClass = isAttending ? 'btn btn-cancel' : 'btn';

    return `
      <div class="event-card">
        <div class="event-date">${event.label}</div>
        <div class="event-counts">Skaters: <span>${skaters}</span> | Goalies: <span>${goalies}</span></div>
        <div class="my-status">${statusText}</div>
        <button class="${btnClass}" onclick="toggleRsvp('${event.id}')">${btnText}</button>
      </div>
    `;
  }).join('');
}

// Toggle RSVP for a specific event
function toggleRsvp(eventId) {
  const profile = JSON.parse(localStorage.getItem('profile') || 'null');
  if (!profile || !profile.first || !profile.last) {
    alert('Please save your profile first!');
    return;
  }
  const rsvps = getRsvps();
  const userKey = getUserKey(profile);
  // Initialize event RSVPs if needed
  if (!rsvps[eventId]) rsvps[eventId] = {};
  const current = rsvps[eventId][userKey];
  // Toggle attending status
  rsvps[eventId][userKey] = {
    name: `${profile.first} ${profile.last}`,
    pos: profile.pos,
    attending: current ? !current.attending : true
  };
  saveRsvps(rsvps);
  renderEvents();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  renderEvents();
  saveProfileBtn.addEventListener('click', saveProfile);
  refreshBtn.addEventListener('click', renderEvents);
});

/* TEST INSTRUCTIONS:
 * 1. Open index.html in browser (or use Live Server)
 * 2. Fill in First Name, Last Name, select position, click "Save Profile"
 * 3. Click "RSVP Yes" on any event - counts should update
 * 4. Refresh the page - profile and RSVPs should persist
 * 5. Click "Cancel RSVP" to toggle off - counts should decrement
 * 6. Test mobile view by resizing browser window
 */
