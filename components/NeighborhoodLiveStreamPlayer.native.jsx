import React, { useRef, useEffect } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";


const BACKEND_URL = "https://minnowspacebackend-e6635e46c3d0.herokuapp.com";

// 1. The HTML Canvas
const blankCanvas = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body { margin: 0; padding: 0; background: black; overflow: hidden; }
        video { width: 100%; height: 100%; object-fit: contain; }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js"></script>
    </head>
    <body>
      <div id="root"></div>
    </body>
  </html>
`;

export default function NeighborhoodLiveStreamPlayer({ sessionId }) {
  const webViewRef = useRef(null);
   useEffect(() => {
     return () => {
       if (sessionId) {
         console.log(`👋 Leaving native stream ${sessionId}`);
         // Fire and forget: don't await this
         fetch(`${BACKEND_URL}/api/stream-leave`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ sessionId }),
         }).catch(() => {});
       }
     };
   }, [sessionId]);

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <WebView
        key={`webview-${sessionId}`}
        ref={webViewRef}
        source={{ html: blankCanvas }}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        androidLayerType="hardware"
        // 🚨 Notice the () => { ... } wrapping the code!
        onLoadEnd={() => {
          setTimeout(() => {
            // Inside the arrow function, we declare the string
            const injectedCode = `
            const BACKEND_URL = "${BACKEND_URL}";

            const warehouse = {
              getChunk: async (session, index) => {
                const res = await fetch(BACKEND_URL + "/api/live-chunk/" + session + "/" + index);
                if (!res.ok) return null;
                return new Uint8Array(await res.arrayBuffer());
              }
            };

            const webtorrentService = {
              ensureClient: async () => {
                if (!window.globalWebTorrentClient) {
                  window.globalWebTorrentClient = new window.WebTorrent();
                }
                return window.globalWebTorrentClient;
              }
            };

    class StreamController {
  constructor(sessionId, addLog, triggerFetch, container) {
    if (container.__streamController) {
      addLog("⚠️ Destroying previous active stream instance to prevent double rendering.");
      container.__streamController.cleanupResources();
    }
    container.__streamController = this;

    this.prefetchQueue = [];
    this.prefetching = false;
    this.bufferQueue = [];
    this.isProcessingQueue = false;

    this.container = container;
    this.addLog = addLog;
    this.sessionId = sessionId;
    this.triggerFetch = triggerFetch;
    this.thumbnailUrl = null;
    this.thumbnailLoaded = false;

    this.nextIndex = 0;
    this.headerLoaded = false;
    this.isProcessing = false;
    this.chunkQueue = new Map();
    this.setupMagnet = null;
    this.detectedMimeType = 'video/mp4; codecs="mp4a.40.2, avc1.4d4015"';
    this.CHUNK_DURATION = 8;

    this.MS = window.ManagedMediaSource || window.MediaSource;
    this.ms = new this.MS();

    this.sb = null;

    this.isManaged = !!window.ManagedMediaSource;
    this.canAppend = !this.isManaged;

    this.ms.addEventListener("startstreaming", () => {
      this.canAppend = true;
      this.addLog("✅ ManagedMediaSource started streaming");
      this.tick();
    });

    this.ms.addEventListener("endstreaming", () => {
      this.canAppend = false;
      this.addLog("⏸️ ManagedMediaSource paused streaming");
    });

    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden;";
    this.wrapper = wrapper;
    this.container.appendChild(wrapper);

    this.video = document.createElement("video");
    this.video.controls = false;
    this.video.disableRemotePlayback = true;
    this.objectUrl = URL.createObjectURL(this.ms); // Added object URL tracking
    this.video.src = this.objectUrl;
    this.video.addEventListener("loadedmetadata", () => {
      const rotation = this.video.videoRotation || 0;
      if (rotation === 90 || rotation === 270) {
        this.video.style.transform = "rotate(" + rotation + "deg) scale(1.4)";
        this.video.style.transformOrigin = "center center";
        this.video.style.objectFit = "contain";
        this.addLog("🔄 Applied rotation from metadata: " + rotation + "°");
      }
    });
    this.video.setAttribute("playsinline", "true");
    this.video.setAttribute("webkit-playsinline", "true");
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.style.width = "100%";
    this.video.style.height = "100%";
    this.video.style.backgroundColor = "black";
    this.wrapper.style.transformOrigin = "center center";
    wrapper.style.cssText =
      "position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; background-color: black;";
    this.wrapper.appendChild(this.video);

    if (window.ManagedMediaSource) {
      this.video.setAttribute("disableRemotePlayback", "true");
    }

    this.fetchThumbnailFromStreamChunk = async () => {
      try {
        const response = await fetch(
          BACKEND_URL + "/api/stream-chunk/thumbnail/" + sessionId
        );
        if (response.ok) {
          const data = await response.json();
          if (data.thumbnailUrl) {
            this.thumbnailUrl = data.thumbnailUrl;
            this.thumbnailLoaded = true;
            this.addLog("✅ Thumbnail loaded from StreamChunk");
            if (this.onThumbnailLoaded)
              this.onThumbnailLoaded(this.thumbnailUrl);
            return true;
          }
        }
      } catch (error) {}
      return false;
    };

    const openEvt = window.ManagedMediaSource
      ? "managedsourceopen"
      : "sourceopen";
    this.ms.addEventListener(openEvt, () => {
      this.addLog("✅ " + openEvt + " fired!");
      this.sweepWarehouse();
    });

    this.watchdog = setInterval(async () => {
      if (this.headerLoaded && !this.isProcessing) {
        const nextData = await warehouse.getChunk(
          this.sessionId,
          this.nextIndex
        );
        if (nextData) this.tick();
      }
    }, 2000);
  }

  processBufferQueue() {
    if (this.bufferQueue.length === 0 || !this.sb || this.sb.updating) return;
    if (this.isManaged && !this.canAppend) return;

    const nextBuffer = this.bufferQueue.shift();
    try {
      this.sb.appendBuffer(nextBuffer);
    } catch (e) {
      console.error("❌ Append error:", e);
    }
  }

  async prefetchChunks() {
    if (this.prefetching) return;
    this.prefetching = true;
    const nextIndex = this.nextIndex;
    for (let i = nextIndex; i < nextIndex + 5; i++) {
      if (!this.chunkQueue.has(i)) {
        const chunk = await warehouse.getChunk(this.sessionId, i);
        if (chunk) {
          this.chunkQueue.set(i, "cached");
          this.prefetchQueue.push({ buffer: chunk, chunkIndex: i });
          this.addLog("📥 Prefetched chunk " + i);
        }
      }
    }
    this.prefetching = false;
    this.processBufferQueue();
  }

  async once(element, event) {
    return new Promise((resolve) =>
      element.addEventListener(event, resolve, { once: true })
    );
  }

  cleanupResources() {
    clearInterval(this.watchdog);
    if (this.video) {
      this.video.pause();
      this.video.src = "";
      this.video.load();
      this.video.removeAttribute("src");
      this.video.remove();
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl); // Frees WebView memory
    }
    if (this.ms && this.ms.readyState === "open") {
      try {
        this.ms.endOfStream();
      } catch (e) {}
    }
    if (this.sb) {
      try {
        this.ms.removeSourceBuffer(this.sb);
      } catch (e) {}
    }
    this.chunkQueue.clear();
  }

  forceTick() {
    this.tick();
  }

  createSourceBuffer() {
    if (this.sb || !this.detectedMimeType || this.ms.readyState !== "open")
      return;
    try {
      this.sb = this.ms.addSourceBuffer(this.detectedMimeType);
      this.sb.mode = "sequence";
      this.sb.addEventListener("updateend", () => {
        this.isProcessing = false;
        this.tick();
      });
    } catch (e) {
      if (
        this.detectedMimeType !== 'video/mp4; codecs="mp4a.40.2, avc1.4d4015"'
      ) {
        this.detectedMimeType = 'video/mp4; codecs="mp4a.40.2, avc1.4d4015"';
        this.createSourceBuffer();
      }
    }
  }

  async stitchAndShip() {
    const blobParts = [];
    const header = await warehouse.getChunk(this.sessionId, -1);
    if (!header) return;
    blobParts.push(header);
    for (let i = 0; i <= this.nextIndex; i++) {
      const chunk = await warehouse.getChunk(this.sessionId, i);
      if (chunk) blobParts.push(chunk);
    }
    return new File(
      blobParts,
      "neighborhood_stream_" + this.sessionId + ".mp4",
      { type: "video/mp4" }
    );
  }

  async sweepWarehouse() {
    const header = await warehouse.getChunk(this.sessionId, -1);
    if (header) {
      if (!this.detectedMimeType)
        this.detectedMimeType = 'video/mp4; codecs="mp4a.40.2, avc1.4d4015"';
      this.setupMagnet = "cached";
      if (this.ms.readyState === "open" && !this.sb) this.createSourceBuffer();
      this.tick();
    }
  }

  getThumbnailUrl() {
    return this.thumbnailUrl;
  }

  addChunks(chunks) {
    chunks.forEach((c) => {
      if (c.chunkIndex === -1 && c.rotation) {
        const rot = c.rotation;
        if (rot === 90 || rot === 270) {
          this.video.style.transform = "rotate(" + rot + "deg)";
          this.video.style.transformOrigin = "center center";
          this.video.style.objectFit = "contain";
          this.video.style.width = "100%";
          this.video.style.height = "100%";
        }
      }
      if (c.thumbnailUrl && !this.thumbnailLoaded) {
        this.thumbnailUrl = c.thumbnailUrl;
        this.thumbnailLoaded = true;
      }
      if (c.chunkIndex === -1 && !this.headerLoaded) {
        this.setupMagnet = c.magnetLink;
        this.detectedMimeType =
          c.mimeType?.replace(/['"]+/g, '"') ||
          'video/mp4; codecs="mp4a.40.2, avc1.4d4015"';
        if (this.ms.readyState === "open") this.createSourceBuffer();
      }
      if (c.chunkIndex >= 0) this.chunkQueue.set(c.chunkIndex, c.magnetLink);
    });
    this.tick();
  }

  async tick() {
    if (this.isProcessing) return;
    if (this.ms.readyState !== "open") await this.once(this.ms, "sourceopen");
    if (this.sb?.updating) return;

    if (this.isManaged && !this.canAppend) return;

    if (!this.sb && this.detectedMimeType) {
      try {
        if (!this.MS.isTypeSupported(this.detectedMimeType)) {
          this.detectedMimeType = 'video/mp4; codecs="mp4a.40.2, avc1.4d4015"';
        }
        this.sb = this.ms.addSourceBuffer(this.detectedMimeType);
        this.sb.mode = "sequence";
        this.sb.addEventListener("updateend", () => {
          this.isProcessing = false;
          this.processBufferQueue();
          this.tick();
        });
      } catch (e) {
        console.error("❌ SourceBuffer Fail:", e);
      }
    }

    if (!this.sb || this.sb.updating) return;

    if (!this.headerLoaded) {
      const hasHeaderInWarehouse = await warehouse.getChunk(
        this.sessionId,
        -1
      );
      if (this.setupMagnet || hasHeaderInWarehouse) {
        this.isProcessing = true;
        try {
          const magnet = this.setupMagnet || "cached";
          const buf = await this.download(magnet, -1);
          if (buf) {
            this.sb.appendBuffer(buf);
            this.headerLoaded = true;
            this.nextIndex = 0;
            const tryPlay = (delay = 100) => {
              this.video.play().catch(() => {
                if (delay < 5000) {
                  this.video.currentTime += 0.1;
                  setTimeout(() => tryPlay(delay * 1.5), delay);
                }
              });
            };
            tryPlay();
          } else {
            this.isProcessing = false;
          }
        } catch (e) {
          this.isProcessing = false;
        }
        return;
      }
    }

    const hasInQueue = this.chunkQueue.has(this.nextIndex);
    const hasInWarehouse = await warehouse.getChunk(
      this.sessionId,
      this.nextIndex
    );

    if (this.headerLoaded && (hasInQueue || hasInWarehouse)) {
      this.isProcessing = true;
      const magnet = hasInWarehouse
        ? "cached"
        : this.chunkQueue.get(this.nextIndex);
  try {
        const buf = await this.download(magnet, this.nextIndex);
        
        if (buf && !this.sb.updating) {
          try {
            // Try to append the video chunk
            this.sb.appendBuffer(buf);
            this.nextIndex++; // Advance on success
          } catch (appendError) {
            // 🚨 If the decoder rejects it, log it and force advance!
            this.nextIndex++; // Force advance so we don't get stuck
          }

        const t = this.video.currentTime;
          if (t > 15 && this.sb && !this.sb.updating) {
            try {
              this.sb.remove(0, t - 10);
            } catch (_) {}
          }
        } else {
          this.isProcessing = false;
        }
      } catch (e) {
        // 👈 This is the outer catch that was missing!
        console.error("❌ Download failed:", e);
        this.isProcessing = false;
      }
    }
  }

  async download(magnet, index) {
    const cached = await warehouse.getChunk(this.sessionId, index);
    if (cached) return cached;

    const p2p = await Promise.race([
      this.tryP2P(magnet, index),
      new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (p2p) {
      await warehouse.saveChunk(this.sessionId, index, p2p);
      return p2p;
    }

    try {
      const res = await fetch(
        BACKEND_URL + "/api/live-chunk/" + this.sessionId + "/" + index,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = new Uint8Array(await res.arrayBuffer());
      await warehouse.saveChunk(this.sessionId, index, buf);
      return buf;
    } catch (err) {
      console.warn("[stream] chunk " + index + " failed both paths", err);
      return null;
    }
  }

  async tryP2P(magnet, index) {
    return new Promise(async (resolve) => {
      if (!magnet || magnet === "cached") return resolve(null);
      try {
        const client = await webtorrentService.ensureClient();
        const torrent =
          client.get(magnet) ||
          (await new Promise((r) => client.add(magnet, r)));

        const extractAndCleanup = async () => {
          try {
            const buf = await torrent.files[0].arrayBuffer();
            try {
              await client.remove(torrent.infoHash);
            } catch (_) {}
            resolve(new Uint8Array(buf));
          } catch (err) {
            try {
              client.remove(torrent.infoHash);
            } catch (_) {}
            resolve(null);
          }
        };

        if (torrent.done) {
          return extractAndCleanup();
        }

        torrent.once("done", extractAndCleanup);

        setTimeout(() => {
          try {
            client.remove(torrent.infoHash);
          } catch (_) {}
          resolve(null);
        }, 10000);
      } catch (err) {
        resolve(null);
      }
    });
  }

  destroy() {
    clearInterval(this.watchdog);
    if (this.video) {
      this.video.pause();
      this.video.src = "";
      this.video.remove();
    }
  }
}

            const controller = new StreamController(
              "${sessionId}", 
              console.log, 
              () => {}, 
              document.getElementById("root")
            );
            true;
          `;

            webViewRef.current?.injectJavaScript(injectedCode);
          }, 500);
        }}
      />
    </View>
  );
}