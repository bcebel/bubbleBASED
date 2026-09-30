// downloadQueue.js
import idbChunkStore from "@thaunknown/idb-chunk-store";
import { saveMedia, getMedia } from "../components/mediaCache";
import { webtorrentService } from "../utils/webtorrentService";
import parseTorrent from "parse-torrent";
import { getMagnetForCid } from "../utils/magnetCache";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const queue = [];
let active = null;
let processing = false;

// ─── client singleton ─────────────────────────────────────
function getClient() {
  const c = window.globalWebTorrentClient;
  if (!c) {
    throw new Error("[queue] globalWebTorrentClient not ready");
  }
  if (c.destroyed) {
    throw new Error("[queue] globalWebTorrentClient destroyed");
  }
  return c;
}

// ─── public: enqueue a download ───────────────────────────
export function enqueueDownload(cid, media, priority = 10) {
  const existing = queue.find((j) => j.cid === cid);
  if (existing) {
    existing.priority = Math.min(existing.priority, priority);
    sortQueue();
    return existing.promise;
  }

  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  queue.push({ cid, media, priority, resolve, reject, promise });
  sortQueue();
  drain();
  return promise;
}

function sortQueue() {
  queue.sort((a, b) => a.priority - b.priority);
}

// ─── public: drop jobs the user scrolled past ─────────────
export function cancelBelowPriority(maxPriority) {
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].priority > maxPriority) {
      queue[i].reject(new Error("cancelled"));
      queue.splice(i, 1);
    }
  }
}

// ─── internal: run one job ────────────────────────────────
async function drain() {
  if (processing || !queue.length) return;
  processing = true;
  sortQueue();
  active = queue.shift();


  try {
    await runJob(active);
    active.resolve();
  } catch (err) {
    console.warn("[queue] job failed", active.cid, err);
    active.reject(err);
  } finally {
    processing = false;
    active = null;
    drain();
  }
}

async function runJob(job) {
  const { cid, media } = job;
  const cached = await getMedia(cid);
  if (cached?.blob) {
    return;
  }

  const magnetLink = media.magnetLink || (await getMagnetForCid(cid));

  const winner = await raceSources(cid, magnetLink, media);

  if (!winner) throw new Error("both sources failed");

  await saveMedia(
    cid,
    winner.blob,
    media.mimeType || "application/octet-stream",
    media.fileName || `media-${cid}`,
  );
}

// ─── the race ─────────────────────────────────────────────
function raceSources(cid, magnetLink, media) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;

      cleanup();
      resolve(result);
    };

    let torrentHandle = null;
    const cleanups = [];
    const cleanup = () => {
      if (torrentHandle) {
        try {
          torrentHandle.torrent.destroy({ destroyStore: false });
        } catch (_) {}
      }
      cleanups.forEach((fn) => fn());
    };

    // ─── side A: HTTP ─────────────────────────────────────
    const httpAbort = new AbortController();
    cleanups.push(() => httpAbort.abort());

    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/webseed/${cid}`, {
          signal: httpAbort.signal,
        });
        if (!res.ok) throw new Error(`http ${res.status}`);
        const blob = await res.blob();
        if (blob.size === 0) throw new Error("empty blob");
        finish({ blob, source: "http" });
      } catch (err) {
        if (!settled && err.name !== "AbortError") {
       
        }
      }
    })();

    // ─── side B: P2P ──────────────────────────────────────
    if (!magnetLink) {
      const hardCap = setTimeout(() => finish(null), 120_000);
      cleanups.push(() => clearTimeout(hardCap));
      return;
    }

    (async () => {
      try {
        const c = getClient();
        const cleanMagnet = magnetLink.replace(/&ws=[^&]*/g, "");
        const infoHash = parseTorrent(cleanMagnet).infoHash;

        let torrent = await c.get(infoHash);
        if (!torrent) {
          torrent = await c.add(cleanMagnet, {
            store: idbChunkStore,
            storeOpts: { name: `media-${cid}` },
            announce: window.enhancedTrackers || webtorrentService.trackers,
            strategy: media.fileType === "image" ? "rarest" : "sequential",
            urlList: [`${BACKEND_URL}/api/webseed/${cid}`],
          });
        }

        if (!torrent || typeof torrent.once !== "function") {
          throw new Error("got a non-torrent: " + typeof torrent);
        }

        torrentHandle = { torrent };

        // ─── DIAGNOSTIC LISTENERS ─────────────────────────
        const onWire = (wire) => {
        
        };
        const onNoPeers = (announceType) => {
        };
        const onWarning = (err) => {
      
        };
        const onError = (err) => {
     
        };

        torrent.on("wire", onWire);
        torrent.on("noPeers", onNoPeers);
        torrent.on("warning", onWarning);
        torrent.on("error", onError);

        cleanups.push(() => {
          try {
            torrent.removeListener("wire", onWire);
          } catch (_) {}
          try {
            torrent.removeListener("noPeers", onNoPeers);
          } catch (_) {}
          try {
            torrent.removeListener("warning", onWarning);
          } catch (_) {}
          try {
            torrent.removeListener("error", onError);
          } catch (_) {}
        });

        // periodic stats while racing
        const statsInterval = setInterval(() => {
          if (settled) {
            clearInterval(statsInterval);
            return;
          }
       
        }, 2000);
        cleanups.push(() => clearInterval(statsInterval));

        // if already done, just grab the blob
        if (torrent.done) {
          const file = torrent.files[0];
          if (file) {
            const blob = await file.blob();
            if (blob.size > 0) finish({ blob, source: "p2p" });
          }
          return;
        }

        torrent.once("done", async () => {
        
          try {
            const file = torrent.files[0];
            if (!file) return;
            const blob = await file.blob();
            if (blob.size > 0) finish({ blob, source: "p2p" });
          } catch (err) {
            console.warn("[queue] p2p blob failed", err);
          }
        });

        const stallTimeout = setTimeout(() => {
          if (!settled) {
          
            try {
              torrent.destroy({ destroyStore: false });
            } catch (_) {}
          }
        }, 60_000);
        cleanups.push(() => clearTimeout(stallTimeout));
      } catch (err) {
        if (!settled) {
        }
      }
    })();

    const hardCap = setTimeout(() => finish(null), 120_000);
    cleanups.push(() => clearTimeout(hardCap));
  });
}
