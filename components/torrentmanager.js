// torrentManager.js
import idbChunkStore from "@thaunknown/idb-chunk-store";
import { getMedia } from "../components/mediaCache";
import { webtorrentService } from "../utils/webtorrentService";
import parseTorrent from "parse-torrent";


// Global WebTorrent client instance
let client = null;
const activeDownloads = new Map(); // CID -> { torrent, blobUrl, isDone, priority }

const MAX_ACTIVE_TORRENTS = 8; // Reduced from 15 to keep memory footprint light

// Internal Queue State
let queue = [];
let isQueueProcessing = false;

// Eviction helper — call this before adding a new torrent
const evictOldestIfNeeded = () => {
  if (activeDownloads.size < MAX_ACTIVE_TORRENTS) return;
  if (!client) return;

  // Find lowest priority or oldest item to evict
  let lowestPriorityCid = null;
  let maxPriority = -1;

  for (const [cid, record] of activeDownloads.entries()) {
    if (record.priority > maxPriority && !record.isFocused) {
      maxPriority = record.priority;
      lowestPriorityCid = cid;
    }
  }

  const targetCid = lowestPriorityCid || activeDownloads.keys().next().value;
  const item = activeDownloads.get(targetCid);

  if (item?.torrent) {
    client.remove(item.torrent.infoHash);
  }
  if (item?.blobUrl) {
    URL.revokeObjectURL(item.blobUrl);
  }
  activeDownloads.delete(targetCid);
};

export const getOrStartTorrent = async (magnetLink, cid, media = {}) => {
  if (typeof window === "undefined") return null;
console.log("[torrent] add", magnetLink);
  if (!client) {
    const WebTorrent = window.WebTorrent;
    client = new WebTorrent();
  }

  // 1. Return immediately if already tracked in-memory
  if (activeDownloads.has(cid)) {
    return activeDownloads.get(cid);
  }

  // 2. Evict before adding (prevents unbounded growth)
  evictOldestIfNeeded();

  // 3. Parse infoHash so we can check if client already has it
  const infoHash = parseTorrent(magnetLink).infoHash;

  let torrent = await client.get(infoHash);

  if (!torrent) {
  torrent = await client.add(magnetLink, {
    store: idbChunkStore,
    storeOpts: { name: `media-${cid}` },
    announce: window.enhancedTrackers || webtorrentService.trackers,
    strategy: media.fileType === "image" ? "rarest" : "sequential",
    urlList: [`${BACKEND_URL}/api/webseed/${cid}`],
  });
  }

  const record = {
    torrent,
    blobUrl: null,
    isDone: false,
    priority: media.priority || 10,
  };
  activeDownloads.set(cid, record);

  console.log("[torrent] added", torrent.infoHash);
  // 4. Handle chunk assembly without dying on React unmount
  torrent.on("done", async () => {
    try {
      const file = torrent.files[0];
      if (file) {
        const blob = await file.blob();
        record.blobUrl = URL.createObjectURL(blob);
        record.isDone = true;
      }
    } catch (err) {
      console.error("Failed to generate blob:", err);
    }
  });

  return record;
};

// -------------------------------------------------------------
// Central Queue & Priority Window Management
// -------------------------------------------------------------

/**
 * Call this from Gallery/Feed when current focused index changes.
 * @param {Array} mediaList - Array of media objects [{ cid, magnetLink, ... }]
 * @param {number} currentIndex - Index of current focused item
 */
export const updatePriorityWindow = (mediaList = [], currentIndex = 0) => {
  if (!mediaList.length) return;

  // Window bounds: 1 behind (-1), current (0), 3 ahead (+1, +2, +3)
  const LOOK_BEHIND = 1;
  const LOOK_AHEAD = 3;

  const startIndex = Math.max(0, currentIndex - LOOK_BEHIND);
  const endIndex = Math.min(mediaList.length - 1, currentIndex + LOOK_AHEAD);

  const activeCids = new Set();
  const nextQueue = [];

  for (let i = startIndex; i <= endIndex; i++) {
    const item = mediaList[i];
    if (!item || !item.cid) continue;

    activeCids.add(item.cid);

    // Assign numeric priority (0 = focused, lower number = higher priority)
    let priority = 10;
    if (i === currentIndex)
      priority = 0; // Focus
    else if (i === currentIndex + 1)
      priority = 1; // Next (+1)
    else if (i === currentIndex + 2)
      priority = 2; // Next (+2)
    else if (i === currentIndex + 3)
      priority = 3; // Next (+3)
    else if (i === currentIndex - 1) priority = 4; // Previous (-1)

    // Update in active map if exists
    if (activeDownloads.has(item.cid)) {
      const record = activeDownloads.get(item.cid);
      record.priority = priority;
      record.isFocused = priority === 0;
    }

    nextQueue.push({ ...item, priority });
  }

  // Sort queue by priority ascending (0 first)
  queue = nextQueue.sort((a, b) => a.priority - b.priority);

  // Pause or remove torrents outside window to conserve memory/network
  for (const [cid, record] of activeDownloads.entries()) {
    if (!activeCids.has(cid) && !record.isDone) {
      // Pause torrent download if outside window
      if (record.torrent) {
        record.torrent.pause();
      }
    } else if (activeCids.has(cid) && record.torrent?.paused) {
      record.torrent.resume();
    }
  }

  processQueue();
};

const processQueue = async () => {
  if (isQueueProcessing || queue.length === 0) return;
  isQueueProcessing = true;

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item.cid) continue;

    try {
      // 1. Skip if already cached in IndexedDB
      const cached = await getMedia(item.cid);
      if (cached?.blob) continue;

      // 2. Skip if already downloaded in WebTorrent memory
      if (
        activeDownloads.has(item.cid) &&
        activeDownloads.get(item.cid).isDone
      ) {
        continue;
      }

      // 3. Start background torrent fetch calmly (serial execution)
      if (item.magnetLink) {
        const record = await getOrStartTorrent(item.magnetLink, item.cid, item);

        // Wait until we get at least some initial chunks or completion before starting next item
        await new Promise((resolve) => {
          if (record.isDone || record.torrent.progress > 0.15) {
            resolve();
            return;
          }

          const onProgress = () => {
            if (record.torrent.progress > 0.15 || record.isDone) {
              record.torrent.removeListener("download", onProgress);
              record.torrent.removeListener("done", onProgress);
              resolve();
            }
          };

          record.torrent.on("download", onProgress);
          record.torrent.on("done", onProgress);

          // Timeout safety: don't block the queue forever if seeds are slow
          setTimeout(resolve, 3000);
        });
      }
    } catch (err) {
      console.warn("Queue prefetch skipped item:", item.cid, err);
    }
  }

  isQueueProcessing = false;
};

// -------------------------------------------------------------
// Component Streaming Fetcher
// -------------------------------------------------------------

export const getMediaWithFallback = async (media, onStatusChange) => {
  const { magnetLink, cid, ipfsUrl, fallbackUrl } = media;

  console.log("[fallback] start", media.cid, media.magnetLink);
  const httpUrl =
    ipfsUrl || fallbackUrl || `https://gateway.pinata.cloud/ipfs/${cid}`;

  // 1. Check IndexedDB first (Fastest path)
  try {
    const cached = await getMedia(cid);
    if (cached?.blob) {
      onStatusChange?.("cached");
      return { url: URL.createObjectURL(cached.blob), source: "cache" };
    }
  } catch (err) {
    console.log("Cache miss, proceeding to network:", err);
  }

  // 2. Check if already active/completed in memory queue
  if (activeDownloads.has(cid)) {
    const record = activeDownloads.get(cid);
    if (record.isDone && record.blobUrl) {
      onStatusChange?.("p2p_streaming");
      return { url: record.blobUrl, source: "p2p", torrent: record.torrent };
    }
  }

  // 3. If no magnet link, return HTTP URL directly
  if (!magnetLink) {
    onStatusChange?.("fallback_http");
    return { url: httpUrl, source: "http" };
  }

  // 4. Race P2P against 4-second HTTP Fallback Timer
  return new Promise(async (resolve) => {
    let resolved = false;

    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        onStatusChange?.("fallback_http");
        resolve({ url: httpUrl, source: "http_fallback" });
      }
    }, 4000);

    try {
      onStatusChange?.("connecting_p2p");
      const record = await getOrStartTorrent(magnetLink, cid, media);
  console.log("[fallback] torrent result", typeof record, record);
      const checkProgress = () => {
        if (!resolved && (record.torrent.progress > 0 || record.isDone)) {
          resolved = true;
          clearTimeout(fallbackTimer);
          onStatusChange?.("p2p_streaming");
          resolve({
            url:
              record.blobUrl ||
              (record.torrent.files[0]
                ? URL.createObjectURL(record.torrent.files[0])
                : httpUrl),
            source: "p2p",
            torrent: record.torrent,
          });
        }
      };

      if (record.isDone || record.torrent.progress > 0) {
        checkProgress();
      } else {
        record.torrent.on("download", checkProgress);
        record.torrent.on("done", checkProgress);
      }
    } catch (err) {
        console.log("[fallback] error", err);
      if (!resolved) {
        resolved = true;
        clearTimeout(fallbackTimer);
        onStatusChange?.("fallback_http");
        resolve({ url: httpUrl, source: "http_fallback" });
      }
    }
  });
};
