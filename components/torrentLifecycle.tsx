// torrentLifecycle.sketch.js
//
// A sketch, not a drop-in file. Ports the ideas from your torrentmanager.js
// into an explicit state machine so lifecycle decisions live in one place
// instead of being split between updatePriorityWindow() and the component's
// own "almost focused" effect.
//
// You'll need to wire getMediaWithFallback / mediaCache into this (or fold
// their logic in), and update WebTorrentMedia.js to call reconcile()-driven
// state via getRecord(cid) rather than calling getOrStartTorrent directly.

import idbChunkStore from "@thaunknown/idb-chunk-store";
import { webtorrentService } from "../utils/webtorrentService";
import parseTorrent from "parse-torrent";

let client = null;
const records = new Map(); // cid -> Record

const ROLE = {
  FOCUSED: "focused",
  PREFETCH: "prefetch",
  RECENT: "recent",
  FAR: "far", // torrent detached, idb chunk store kept (fast resume)
  COLD: "cold", // torrent detached, idb chunk store cleared
};

// Tune these to taste — this is your -2..+2-ish window, made explicit.
const WINDOW = {
  aheadStart: 1,
  aheadEnd: 2, // offsets +1, +2 => prefetch
  behindKeep: -1, // offset -1 => recent (still seeding, blob kept)
  coldDistance: 6, // beyond this distance, also drop the idb store
};

function roleForOffset(offset) {
  if (offset === 0) return ROLE.FOCUSED;
  if (offset >= WINDOW.aheadStart && offset <= WINDOW.aheadEnd)
    return ROLE.PREFETCH;
  if (offset === WINDOW.behindKeep) return ROLE.RECENT;
  if (Math.abs(offset) > WINDOW.coldDistance) return ROLE.COLD;
  return ROLE.FAR;
}

function getClient() {
  if (!client) {
    const WebTorrent = window.WebTorrent;
    client = new WebTorrent();
  }
  return client;
}

function ensureRecord(cid) {
  let record = records.get(cid);
  if (!record) {
    record = {
      cid,
      torrent: null,
      blobUrl: null,
      isDone: false,
      role: null,
      listenersAttached: false,
    };
    records.set(cid, record);
  }
  return record;
}

async function attachTorrent(record, magnetLink, media) {
  if (record.torrent) return record.torrent; // already attached this pass

  const c = getClient();
  const infoHash = parseTorrent(magnetLink).infoHash;
  let torrent = c.get(infoHash);

  if (!torrent) {
    torrent = await c.add(magnetLink, {
      store: idbChunkStore,
      storeOpts: { name: `media-${record.cid}` },
      announce: window.enhancedTrackers || webtorrentService.trackers,
      strategy: media.fileType === "image" ? "rarest" : "sequential",
      // destroyStoreOnDestroy defaults to false — remove() below keeps the
      // idb store unless we explicitly ask it not to.
    });
  }

  record.torrent = torrent;

  if (!record.listenersAttached) {
    torrent.on("done", async () => {
      try {
        const file = torrent.files[0];
        if (!file) return;
        const blob = await file.blob();
        if (record.blobUrl) URL.revokeObjectURL(record.blobUrl);
        record.blobUrl = URL.createObjectURL(blob);
        record.isDone = true;
      } catch (err) {
        console.error("blob build failed", err);
      }
    });
    record.listenersAttached = true;
  }

  return torrent;
}

function detachTorrent(record, { destroyStore }) {
  if (!record.torrent) return;
  const c = getClient();
  try {
    c.remove(record.torrent.infoHash, { destroyStore });
  } catch (err) {
    console.warn("torrent remove failed", err);
  }
  record.torrent = null;
  record.listenersAttached = false;

  if (destroyStore && record.blobUrl) {
    URL.revokeObjectURL(record.blobUrl);
    record.blobUrl = null;
    record.isDone = false;
  }
}

async function applyRole(record, media, role) {
  if (record.role === role) return; // no-op, nothing changed

  switch (role) {
    case ROLE.FOCUSED:
    case ROLE.PREFETCH:
      if (media.magnetLink) {
        await attachTorrent(record, media.magnetLink, media);
        if (record.torrent?.paused) record.torrent.resume();
      }
      break;

    case ROLE.RECENT:
      // still around, still seeding — just make sure it isn't paused
      if (record.torrent?.paused) record.torrent.resume();
      break;

    case ROLE.FAR:
      // stop network/seeding cost, keep the idb chunk store for fast resume
      detachTorrent(record, { destroyStore: false });
      break;

    case ROLE.COLD:
      // fully reclaim, including disk
      detachTorrent(record, { destroyStore: true });
      break;
  }

  record.role = role;
}

/**
 * Call this whenever the focused index changes. Replaces updatePriorityWindow.
 * @param {Array} mediaList - full list currently in the gallery
 * @param {number} currentIndex
 */
export function reconcile(mediaList = [], currentIndex = 0) {
  if (!mediaList.length) return;

  const seen = new Set();

  mediaList.forEach((media, i) => {
    if (!media?.cid) return;
    const offset = i - currentIndex;
    const role = roleForOffset(offset);
    seen.add(media.cid);

    const record = ensureRecord(media.cid);
    applyRole(record, media, role);
  });

  // Anything we're tracking that's no longer in the list at all (filtered
  // out, list changed) — fully release it.
  for (const [cid, record] of records.entries()) {
    if (!seen.has(cid)) {
      applyRole(record, {}, ROLE.COLD);
    }
  }
}

/** Read-only status lookup for the component to render from. */
export function getRecord(cid) {
  return records.get(cid);
}
