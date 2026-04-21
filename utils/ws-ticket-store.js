/**
 * WebSocket Ticket Store
 *
 * Issues short-lived, single-use opaque tickets for WebSocket authentication.
 * Mirrors the pattern in app/src/lib/services/ws-ticket-store.ts
 *
 * Flow:
 * 1. Client calls POST /api/ws/ticket (Bearer-authenticated).
 * 2. Server mints a ticket, stores the associated auth context, returns the ticket.
 * 3. Client opens ws://…/meeting?ticket=<ticket>
 * 4. Server redeems the ticket (single-use) and upgrades with the stored context.
 *
 * The JWT never appears in the WebSocket URL.
 */

const { randomUUID } = require('crypto');

/** Tickets expire after 30 seconds — just enough for the WS handshake. */
const TICKET_TTL_MS = 30_000;

/** Hard cap to prevent unbounded growth from unredeemed tickets. */
const MAX_TICKETS = 1_000;

/** @type {Map<string, { payload: object, expiresAt: number }>} */
const tickets = new Map();

/**
 * Prune expired tickets. Called on every issue() to keep the map bounded.
 */
function prune() {
  const now = Date.now();
  for (const [id, t] of tickets) {
    if (t.expiresAt <= now) {
      tickets.delete(id);
    }
  }
}

/**
 * Issue a new single-use ticket.
 * @param {object} payload - Auth context to store (user id, name, roles, etc.)
 * @returns {string} Opaque ticket ID
 */
function issueTicket(payload) {
  prune();

  if (tickets.size >= MAX_TICKETS) {
    throw new Error('Ticket store at capacity');
  }

  const id = randomUUID();
  tickets.set(id, {
    payload,
    expiresAt: Date.now() + TICKET_TTL_MS,
  });
  return id;
}

/**
 * Redeem (consume) a ticket. Returns the payload and deletes the ticket
 * so it cannot be reused.
 * @param {string} ticketId
 * @returns {object|null} The stored payload, or null if invalid/expired/used
 */
function redeemTicket(ticketId) {
  const entry = tickets.get(ticketId);
  if (!entry) return null;

  // Always delete — single use
  tickets.delete(ticketId);

  if (entry.expiresAt <= Date.now()) return null;

  return entry.payload;
}

module.exports = { issueTicket, redeemTicket };
