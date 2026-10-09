// components/WebTorrentMedia.js
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
import { getMagnetForCid } from "../utils/magnetCache";
import { getOrStartTorrent } from "./torrentmanager";

let globalMuted = true;
let globalVolume = 0.5;

const PINATA_GATEWAY =
  process.env.EXPO_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";

export default function WebTorrentMedia({
  media,
  isFocused,
  isAlmostFocused,
  muted = true,
}) {
  const [videoSrc, setVideoSrc] = useState(media?.ipfsUrl);
  const [status, setStatus] = useState("p2p_streaming");
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const videoRef = useRef(null);
  const currentUrlRef = useRef(null);
  const isMountedRef = useRef(true);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(globalVolume);
  const [isMuted, setIsMuted] = useState(muted);
  const progressBarRef = useRef(null);
  const timerRef = useRef(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [videoEl, setVideoEl] = useState(null);

  const isImage =
    media.fileType === "image" ||
    media.type === "image" ||
    media.fileName?.match(/\.(jpg|jpeg|png|gif|webp|avif|heic|heif|svg)$/i);

  const resetActivityTimer = () => {
    setControlsVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (videoRef.current && videoRef.current.paused) return;
    timerRef.current = setTimeout(() => setControlsVisible(false), 1000);
  };

 
useEffect(() => {
  const v = videoRef.current;
  if (!v) return;
  if (isFocused) {
    v.play().catch(() => {});
  } else {
    v.pause();
  }
}, [isFocused, videoSrc, videoEl]);
  // Cleanup on unmount — release the video element fully
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
        globalMuted = false;
        setIsMuted(false);
      } else if (newVolume === 0) {
        videoRef.current.muted = true;
        globalMuted = true;
        setIsMuted(true);
      }
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMutedState = !isMuted;
    globalMuted = nextMutedState;
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

  // Load media (cache → torrent → webseed fallback)
  useEffect(() => {
    if (!isFocused || !media) return;

    let isMounted = true;

    const load = async () => {
      const cached = await getMedia(media.cid);
      if (cached?.blob) {
        setVideoSrc(URL.createObjectURL(cached.blob));
        setIsReady(true);
        return;
      }

      const magnetLink = media.magnetLink || (await getMagnetForCid(media.cid));
      const record = await getOrStartTorrent(
        magnetLink,
        media.cid,
        media,
      ).catch(() => null);

      if (!isMounted) return;

      const client = window.globalWebTorrentClient;
      const hasServer = !!client?._server;
      const hasMetadata = record?.torrent?.ready;
      const hasFile = record?.torrent?.files?.[0];

      if (!isImage && hasServer && hasMetadata && hasFile) {
        const url = record.torrent.files[0].streamURL;
        if (url) {
          setVideoSrc(url);
          setIsReady(true);
          return;
        }
      }

      setVideoSrc(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/webseed/${media.cid}`,
      );
      setIsReady(true);
    };

    load();

    return () => {
      isMounted = false;
      if (currentUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(currentUrlRef.current);
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
      </View>
    );
  }

  if (isImage) {
    return <img src={videoSrc} style={styles.image} alt="User content" />;
  }

  return (
    <View
      style={styles.container}
      onMouseMove={resetActivityTimer}
      onMouseLeave={() => !isPaused && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
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

      <View style={styles.controlsOverlay} onClick={togglePlay}>
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
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    transition: "opacity 0.25s ease-in-out",
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
