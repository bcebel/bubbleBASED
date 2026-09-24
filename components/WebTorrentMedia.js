// WebTorrentMedia.js - ULTIMATE CACHING VERSION (Background Cache)
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { getMedia, saveMedia } from "../components/mediaCache";
import idbChunkStore from "@thaunknown/idb-chunk-store";
import webtorrentService from "../utils/webtorrentService";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { getOrStartTorrent, getMediaWithFallback } from "./torrentmanager";

const CACHE_FOLDER = `${FileSystem.cacheDirectory}webtorrent_media/`;

const ensureCacheDir = async () => {
  if (Platform.OS !== "web") {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, {
        intermediates: true,
      });
    }
  }
};

const PINATA_GATEWAY =
  process.env.EXPO_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";

// Move cache OUTSIDE the component
const pinataCache = new Map();


if (typeof window !== "undefined") {
  window.__pinataCache = pinataCache;
}

const getCachedPinataUrl = (cid, fallbackUrl) => {
  if (pinataCache.has(cid)) {
    console.log(`💾 Pinata cache hit: ${cid}`);
    return pinataCache.get(cid);
  }
  const url = fallbackUrl || `https://${PINATA_GATEWAY}/ipfs/${cid}`;
  pinataCache.set(cid, url);
  //console.log(`💾 Pinata cached: ${cid}`);
  return url;
};

const MAX_PINATA_CACHE = 200;
if (pinataCache.size > MAX_PINATA_CACHE) {
  const firstKey = pinataCache.keys().next().value;
  pinataCache.delete(firstKey);
}
export default function WebTorrentMedia({ media, isFocused, isAlmostFocused }) {
  const [videoSrc, setVideoSrc] = useState(media?.ipfsUrl);
  const [status, setStatus] = useState("p2p_streaming");
  const [progress, setProgress] = useState(0);
  const [peerCount, setPeerCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const videoRef = useRef(null);
  const currentUrlRef = useRef(null);
  const isMountedRef = useRef(true);
  const p2pHitRef = useRef(false);
  const progressRef = useRef(0);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1); // 1 = 100% max volume volume
  const [isMuted, setIsMuted] = useState(true); // Matches your video element's muted={true} default setting
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const progressBarRef = useRef(null);
  const timerRef = useRef(null);

  const [controlsVisible, setControlsVisible] = useState(true);

  const overallTimeoutRef = useRef(null);
  const noProgressTimeoutRef = useRef(null);
  const isImage =
    media.fileType === "image" ||
    media.type === "image" ||
    media.fileName?.match(/\.(jpg|jpeg|png|gif|webp|avif|heic|heif|svg)$/i);

  const resetActivityTimer = () => {
    setControlsVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (videoRef.current && videoRef.current.paused) return;

    timerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      // Automatically toggle off mute if the user slides volume up
      if (newVolume > 0 && isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      } else if (newVolume === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
  };

  // Click handler to toggle speaker muting settings instantly
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMutedState = !isMuted;
    videoRef.current.muted = nextMutedState;
    setIsMuted(nextMutedState);

    // Reset slider view location if unmuting from a zero volume state
    if (!nextMutedState && volume === 0) {
      videoRef.current.volume = 0.5;
      setVolume(0.5);
    }
  };
  // --- 3. VIDEO INTERACTIONS ---
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPaused(false);
      resetActivityTimer();
    } else {
      videoRef.current.pause();
      setIsPaused(true);
      setControlsVisible(true);
    }
  };

  const handleSeek = (e) => {
    if (!videoRef.current || duration === 0 || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    let percentage = (e.clientX - rect.left) / rect.width;
    if (percentage < 0) percentage = 0;
    if (percentage > 1) percentage = 1;

    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === null) return "00:00";
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(secs % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
useEffect(() => {
  if (!isFocused || !media) return;

  let isMounted = true;
  let unsubscribeProgress = null;
  let objectUrl = null;

  const load = async () => {
    try {
      setStatus("checking_cache");

      // 1. Cache first — fastest possible path
      if (media.cid) {
        try {
          const cached = await getMedia(media.cid);
          if (cached?.blob && isMounted) {
            objectUrl = URL.createObjectURL(cached.blob);
            currentUrlRef.current = objectUrl;
            setVideoSrc(objectUrl);
            setStatus("cached");
            setProgress(100);
            setIsReady(true);
            return;
          }
        } catch (_) {}
      }

      // 2. Proxy / fallback / torrent — delegate to manager
      //    (this is the path that knows about /api/webseed)
      setStatus("connecting_p2p");
      const result = await getMediaWithFallback(media, (s) => {
        if (isMounted) setStatus(s);
      });

      if (!isMounted) return;

      // Manager returns either a string URL or { url, ... }
      const url = typeof result === "string" ? result : result?.url;
      if (!url) throw new Error("No media URL returned");

      currentUrlRef.current = url;
      setVideoSrc(url);
      setIsReady(true);

      // If the manager started a torrent, wire up progress + blob swap
      if (result?.torrent) {
        const record = getRecord?.(media.cid);
        const updateStats = () => {
          if (!isMounted) return;
          setProgress(Math.floor((result.torrent.progress || 0) * 100));
          setPeerCount(result.torrent.numPeers || 0);
          if (record?.blobUrl) {
            setVideoSrc(record.blobUrl);
            setStatus("p2p_streaming");
          }
        };
        result.torrent.on("download", updateStats);
        result.torrent.on("done", updateStats);
        unsubscribeProgress = () => {
          result.torrent.removeListener("download", updateStats);
          result.torrent.removeListener("done", updateStats);
        };
      }
    } catch (err) {
      if (isMounted) setStatus("error");
      console.error("Media load failed:", err);
    }
  };

  load();

  return () => {
    isMounted = false;
    if (unsubscribeProgress) unsubscribeProgress();
    if (objectUrl && objectUrl.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrl);
    }
    currentUrlRef.current = null;
  };
}, [isFocused, media?.cid, media?.magnetLink, media?.ipfsUrl]);

  if (!isFocused) return null;

  if (!videoSrc || !isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#0f0f0f" size="large" />
        <Text style={styles.statusText}>
          {status === "checking_cache" && "📦 Loading from cache..."}
          {status === "p2p_swarming" && `📡 Swarming (${progress}%)`}
          {status === "initializing" && "⏳ Initializing..."}
          {status === "fallback_http" && "🌍 Loading video..."}
        </Text>
        {status === "p2p_swarming" && progress > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        )}
      </View>
    );
  }

  if (isImage) {
    return <img src={videoSrc} style={styles.image} alt="User content" />;
  }

  // Custom control states

  // Toggle Play / Pause using the standard web element API

  // Tracks time changes to update your progress bar
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Captures full video length once metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      console.log("🎬 Video loaded and ready");
    }
  };

  // Calculate track bar percentage

  // --- 4. THE LIVE VIEW TREE ---
  return (
    <View
      style={styles.container}
      // @ts-ignore
      onMouseMove={resetActivityTimer}
      onMouseLeave={() => !isPaused && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        style={styles.video}
        muted={isMuted}
        volume={volume}
        loop={true}
        playsInline
        autoPlay
        preload="auto"
        onTimeUpdate={() =>
          videoRef.current && setCurrentTime(videoRef.current.currentTime)
        }
        onLoadedMetadata={() =>
          videoRef.current && setDuration(videoRef.current.duration)
        }
        onLoadedData={() => console.log("🎬 Video loaded and ready")}
        onClick={togglePlay}
        onEnded={() => {
          setIsPaused(false);
          resetActivityTimer();
        }}
        onError={(e) => console.log("❌ Video error:", e)}
      />

      <View
        style={styles.controlsOverlay}
        // @ts-ignore
        onClick={togglePlay}
      >
        <View style={styles.bottomControlBar}>
          {/* 1. Current Time Label */}
          <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>

          {/* 2. LOCKED VOLUME CONTAINER (No more hover tracking functions!) */}
          <View style={styles.volumeControlContainer}>
            <TouchableOpacity style={styles.volumeButton} onPress={toggleMute}>
              <Text style={styles.volumeIconText}>
                {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
              </Text>
            </TouchableOpacity>

            {/* This slider is now locked wide open at 60px permanently */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              style={{
                cursor: "pointer",
                height: "4px",
                backgroundColor: "#00ffff",
                accentColor: "#00ffff",
                outline: "none",
                border: "none",
                marginLeft: "6px",
                width: "60px", // <--- Forces it to stay wide open
                opacity: 1, // <--- Forces it to stay completely visible
                display: "block", // <--- Ensures it never hides on web viewports
              }}
            />
          </View>

          {/* 3. The Clickable Timeline Seek Bar */}
          <TouchableOpacity
            activeOpacity={1}
            style={styles.seekHitbox}
            onPress={handleSeek}
          >
            <View ref={progressBarRef} style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
              <View
                style={[styles.progressKnob, { left: `${progressPercent}%` }]}
              />
            </View>
          </TouchableOpacity>

          {/* 4. Total Duration Label */}
          <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    position: "relative",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    cursor: "pointer",
  },
  image: { width: "100%", height: "100%", objectFit: "contain" },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
    backgroundColor: "#111",
  },
  statusText: {
    color: "rgb(255, 255, 255)",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  progressBarContainer: {
    width: "80%",
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    marginTop: 12,
  },
  progressBar: { height: "100%", backgroundColor: "#00ffff", borderRadius: 2 },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10, // @ts-ignore
    transition: "opacity 0.25s ease-in-out",
  },
  topBar: { position: "absolute", top: 15, right: 15 },
  overlayStatus: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  overlayText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  centerPlayButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)", // @ts-ignore
    backdropFilter: "blur(6px)",
  },
  playIconText: { color: "#fff", fontSize: 20, marginLeft: 2 },
  bottomControlBar: {
    position: "absolute",
    bottom: "5%",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center", // @ts-ignore
    backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))",
  },
  seekHitbox: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 12,
    cursor: "pointer",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    width: "100%",
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#00ffff",
    borderRadius: 2,
  },
  progressKnob: {
    position: "absolute",
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    marginLeft: -6,
    boxShadow: "0px 2px 6px rgba(0,0,0,0.5)",
  },
  timeLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  volumeControlContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
    marginRight: 12,

    marginLeft: 12,
    height: "100%",
    zIndex: "5000",
  },
  volumeButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
    zIndex: "5000",
  },
  volumeIconText: {
    color: "#fff",
    fontSize: 16,
  },
});
