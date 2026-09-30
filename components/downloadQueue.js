// downloadQueue.js
import idbChunkStore from "@thaunknown/idb-chunk-store";
import { saveMedia, getMedia } from "../components/mediaCache";
import { webtorrentService } from "../utils/webtorrentService";
import parseTorrent from "parse-torrent";
import { getMagnetForCid } from "../utils/magnetCache";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const queue = []; // [{ cid, media, priority, resolve, reject }]
let active = null; // the job currently running
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
// priority: lower = sooner. focused=0, +1=1, +2=2, etc.
export function enqueueDownload(cid, media, priority = 10) {
  // already cached? no-op
  // (caller should check, but double-check here for safety)
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

export function cancelOutsideSet(keepCids) {
  const keep = new Set(keepCids);
  for (let i = queue.length - 1; i >= 0; i--) {
    if (!keep.has(queue[i].cid)) {
      try {
        queue[i].resolve();
      } catch (_) {}
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

  // 2. race P2P against HTTP. first to finish wins.
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
    let httpStarted = false;
    const cleanups = [];
    const cleanup = () => {
      if (torrentHandle) {
   //     try {
   //       torrentHandle.torrent.destroy({ destroyStore: false });
   //     } catch (_) {}
      }
      cleanups.forEach((fn) => fn());
    };

    // ─── HTTP side, but not started yet ───────────────────
    const startHTTP = () => {
      if (httpStarted) return;
      httpStarted = true;
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
            console.log(
              "[queue] http side failed",
              cid.slice(0, 12),
              err.message,
            );
          }
        }
      })();
    };

    // ─── P2P side ─────────────────────────────────────────
    if (!magnetLink) {
      // no magnet → HTTP only
      startHTTP();
      const hardCap = setTimeout(() => finish(null), 120_000);
      cleanups.push(() => clearTimeout(hardCap));
      return;
    }

    (async () => {
      let torrent;
      try {
        const c = getClient();
        const cleanMagnet = magnetLink.replace(/&ws=[^&]*/g, "");
        const infoHash = parseTorrent(cleanMagnet).infoHash;

        torrent = c.torrents?.find((t) => t.infoHash === infoHash);
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
          
          const statsInterval = setInterval(() => {
            if (settled) {
              clearInterval(statsInterval);
              return;
            }
         
          }, 2000);
          cleanups.push(() => clearInterval(statsInterval));

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
  }
});

        // ─── HEAD START WINDOW ─────────────────────────────
        // Give P2P 5 seconds to prove it has peers.
        // If it does, HTTP doesn't start yet — let P2P race.
        // If it doesn't, fire HTTP immediately.
        const HEAD_START_MS = 8000;
        let peersSeen = false;

        const peerCheck = setInterval(() => {
          if (settled) return;
          if (torrent.numPeers > 0 && torrent.downloadSpeed > 0) {
            peersSeen = true;
      
            clearInterval(peerCheck);
            // P2P is alive — give it a bit more time before starting HTTP
            // OR start HTTP now and let them race
            startHTTP();
          }
        }, 500);
        cleanups.push(() => clearInterval(peerCheck));

        const headStartTimer = setTimeout(() => {
          if (settled) return;
          clearInterval(peerCheck);
          if (!peersSeen) {
     
          }
          startHTTP();
        }, HEAD_START_MS);
        cleanups.push(() => clearTimeout(headStartTimer));

        // 60s total budget for P2P
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
          // P2P couldn't even start — HTTP immediately
          startHTTP();
        }
      }
    })();

    // hard cap on everything
    const hardCap = setTimeout(() => finish(null), 120_000);
    cleanups.push(() => clearTimeout(hardCap));
  });
}
