// torrentManager.js
import idbChunkStore from "@thaunknown/idb-chunk-store";
import { getMedia, saveMedia } from "../components/mediaCache";
import { webtorrentService } from "../utils/webtorrentService";
import parseTorrent from "parse-torrent";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

let client = null;
const activeDownloads = new Map();

// ─── internal: release one torrent ────────────────────────
function releaseTorrent(cid) {
  const record = activeDownloads.get(cid);
  if (!record) return;

  if (record.torrent && client) {
    try {
      client.remove(record.torrent.infoHash, { destroyStore: false });
      // destroyStore: false keeps IDB chunks so re-attach is instant
    } catch (err) {
      console.warn("release failed", cid, err);
    }
  }

  if (record.blobUrl) {
    URL.revokeObjectURL(record.blobUrl);
  }

  activeDownloads.delete(cid);
}

// ─── exported: release everything outside [i-1, i, i+1] ───
export const releaseOutsideWindow = (mediaList, currentIndex) => {
  const keep = new Set();
  for (let i = currentIndex - 1; i <= currentIndex + 1; i++) {
    const item = mediaList[i];
    if (item?.cid) keep.add(item.cid);
  }

  for (const cid of Array.from(activeDownloads.keys())) {
    if (!keep.has(cid)) releaseTorrent(cid);
  }
};

// ─── exported: release everything (call on gallery unmount) ─
export const releaseAll = () => {
  for (const cid of Array.from(activeDownloads.keys())) {
    releaseTorrent(cid);
  }
};

// ─── exported: start or return a torrent record ───────────
export const getOrStartTorrent = async (magnetLink, cid, media = {}) => {
  if (typeof window === "undefined") return null;

  // Check if our cached client is dead, and if so, recreate it
if (!client || client.destroyed) {
  if (
    window.globalWebTorrentClient &&
    !window.globalWebTorrentClient.destroyed
  ) {
    client = window.globalWebTorrentClient;
  } else {
    const WebTorrent = window.WebTorrent;
    client = new WebTorrent();
    window.globalWebTorrentClient = client;
  }
}

  // already tracked
  if (activeDownloads.has(cid)) {
    return activeDownloads.get(cid);
  }

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

  torrent.on("done", async () => {
    try {
      const file = torrent.files[0];
      if (!file) return;

      const blob = await file.blob();
      record.blobUrl = URL.createObjectURL(blob);
      record.isDone = true;

      // this is the piece that was missing
      try {
await saveMedia(
  cid,
  blob,
  media.mimeType || "application/octet-stream",
  media.fileName || `media-${cid}`,
);        console.log("[cache] wrote to IDB:", cid);
      } catch (err) {
        console.warn("[cache] write failed:", cid, err);
      }
    } catch (err) {
      console.error("Failed to generate blob:", err);
    }
  });

  return record;
};

// ─── exported: get a record without starting anything ─────
export const getRecord = (cid) => activeDownloads.get(cid);

// ─── exported: resolve a URL for the component to render ──

export const getMediaWithFallback = async (media, onStatusChange) => {
  const { magnetLink, cid, ipfsUrl, fallbackUrl } = media;
  const httpUrl = cid
    ? `${BACKEND_URL}/api/webseed/${cid}`
    : ipfsUrl || fallbackUrl || "";

  // cache check first
  try {
    const cached = await getMedia(cid);
    if (cached?.blob) {
      console.log("[cache] HIT", cid);
      onStatusChange?.("cached");
      return { url: URL.createObjectURL(cached.blob), source: "cache" };
    }
    console.log("[cache] miss", cid);
  } catch (err) {
    console.log("[cache] lookup error:", err);
  }

  // 2. Already in-flight and complete
  if (activeDownloads.has(cid)) {
    const record = activeDownloads.get(cid);
    if (record.isDone && record.blobUrl) {
      onStatusChange?.("p2p_streaming");
      return { url: record.blobUrl, source: "p2p", torrent: record.torrent };
    }
  }

  // 3. No magnet — return the HTTP URL directly
  if (!magnetLink) {
    onStatusChange?.("fallback_http");

       if (cid) {
         fetch(httpUrl)
           .then((res) => res.blob())
           .then((blob) => saveMedia(cid, blob, media.mimeType, media.fileName))
           .then(() => console.log("[cache] filled from proxy:", cid))
           .catch((err) => console.warn("[cache] fill failed:", cid, err));
       }
    
    return { url: httpUrl, source: "http" };
  }

  // 4. Race P2P against the 4s HTTP fallback
  return new Promise(async (resolve) => {
    let resolved = false;

    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        onStatusChange?.("fallback_http");


        if (cid) {
          fetch(httpUrl)
            .then((res) => res.blob())
            .then((blob) =>
              saveMedia(cid, blob, media.mimeType, media.fileName),
            )
            .then(() => console.log("[cache] filled from proxy:", cid))
            .catch((err) => console.warn("[cache] fill failed:", cid, err));
        }

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

          if (cid) {
            fetch(httpUrl)
              .then((res) => res.blob())
              .then((blob) =>
                saveMedia(cid, blob, media.mimeType, media.fileName),
              )
              .then(() => console.log("[cache] filled from proxy:", cid))
              .catch((err) => console.warn("[cache] fill failed:", cid, err));
          }


        resolve({ url: httpUrl, source: "http_fallback" });
      }
    }
  });
};
