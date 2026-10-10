// components/WebTorrentMedia.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { getMedia } from "../components/mediaCache";
import { enqueueDownload } from "./downloadQueue";
import { getMagnetForCid } from "../utils/magnetCache";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

let globalVolume = 0.5;

export default function WebTorrentMedia({
  media,
  isFocused,
  isAlmostFocused,
  muted = true,
}) {
  const [videoSrc, setVideoSrc] = useState(media?.ipfsUrl);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("idle");
  const videoRef = useRef(null);
  const currentUrlRef = useRef(null);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(globalVolume);
  const [isMuted, setIsMuted] = useState(muted);
  const progressBarRef = useRef(null);
  const timerRef = useRef(null);
  const [videoEl, setVideoEl] = useState(null);

  const isImage =
    media?.fileType === "image" ||
    media?.mediaType === "image" ||
    media?.fileName?.match(/\.(jpg|jpeg|png|gif|webp|avif|heic|heif|svg)$/i);

  const resetActivityTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (videoRef.current && videoRef.current.paused) return;
    timerRef.current = setTimeout(() => {}, 1000);
  };

  // Focus drives play/pause. `muted` prop drives sound.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isFocused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isFocused, videoSrc, videoEl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
        videoRef.current.src = "";
        videoRef.current.load();
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    globalVolume = newVolume;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      } else if (newVolume === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMutedState = !isMuted;
    videoRef.current.muted = nextMutedState;
    setIsMuted(nextMutedState);
    if (!nextMutedState && volume === 0) {
      globalVolume = 0.5;
      videoRef.current.volume = 0.5;
      setVolume(0.5);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPaused(false);
      resetActivityTimer();
    } else {
      videoRef.current.pause();
      setIsPaused(true);
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

  // Load media: cache first, else webseed + background download
  useEffect(() => {
    if ((!isFocused && !isAlmostFocused) || !media?.cid) return;

    let cancelled = false;

    const load = async () => {
      setIsReady(false);

      // 1. Cache hit → play from blob
      try {
        const cached = await getMedia(media.cid);
        if (cancelled) return;
        if (cached?.blob) {
          const url = URL.createObjectURL(cached.blob);
          currentUrlRef.current = url;
          setVideoSrc(url);
          setIsReady(true);
          setStatus("cached");
          return;
        }
      } catch (_) {}

      if (cancelled) return;

      // 2. Miss → use webseed immediately, kick off background P2P/cache
      setVideoSrc(`${BACKEND_URL}/api/webseed/${media.cid}`);
      setIsReady(true);
      setStatus("fallback_http");

      const priority = isFocused ? 0 : isAlmostFocused ? 2 : 5;
      enqueueDownload(media.cid, media, priority).catch(() => {});
    };

    load();

    return () => {
      cancelled = true;
      if (currentUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
      currentUrlRef.current = null;
    };
  }, [isFocused, isAlmostFocused, media?.cid, media?.magnetLink]);

  if (!isFocused && !isAlmostFocused) return null;

  if (!videoSrc || !isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#00ffff" size="large" />
        <Text style={styles.statusText}>
          {status === "checking_cache" && "📦 Loading from cache..."}
          {status === "fallback_http" && "🌍 Loading video..."}
          {status === "idle" && "⏳ Initializing..."}
        </Text>
      </View>
    );
  }

  if (isImage) {
    return (
      <img
        src={videoSrc}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        alt=""
      />
    );
  }

  return (
    <View style={styles.container} onMouseMove={resetActivityTimer}>
      <video
        ref={(el) => {
          videoRef.current = el;
          setVideoEl(el);
        }}
        src={videoSrc}
        style={styles.video}
        muted={muted}
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
        onError={(e) => console.log("❌ Video error:", e)}
      />

      <View style={styles.controlsOverlay}>
        <View style={styles.bottomControlBar}>
          <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>

          <View style={styles.volumeControlContainer}>
            <TouchableOpacity style={styles.volumeButton} onPress={toggleMute}>
              <Text style={styles.volumeIconText}>
                {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
              </Text>
            </TouchableOpacity>
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
                width: "60px",
                opacity: 1,
                display: "block",
              }}
            />
          </View>

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
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
    backgroundColor: "#111",
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  bottomControlBar: {
    position: "absolute",
    bottom: "5%",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
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
    marginLeft: 12,
    marginRight: 12,
    height: "100%",
    zIndex: 5000,
  },
  volumeButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5000,
  },
  volumeIconText: {
    color: "#fff",
    fontSize: 16,
  },
});
