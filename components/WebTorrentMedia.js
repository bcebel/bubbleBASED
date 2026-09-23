// components/WebTorrentMedia.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { getMedia, saveMedia } from "./mediaCache";
import { getOrStartTorrent, getMediaWithFallback } from "./torrentmanager";

const PINATA_GATEWAY =
  process.env.EXPO_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";

export default function WebTorrentMedia({ media, isFocused, isAlmostFocused }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [status, setStatus] = useState("idle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [peerCount, setPeerCount] = useState(0);

  const videoRef = useRef(null);
  const isMountedRef = useRef(true);
  const objectUrlRef = useRef(null);

  const isVideo =
    media?.fileType === "video" ||
    media?.mediaType === "video" ||
    (media?.fileName && /\.(mp4|mov|webm|avi|mkv)$/i.test(media.fileName));

  const isImage =
    !isVideo &&
    (media?.fileType === "image" ||
      media?.mediaType === "image" ||
      (media?.fileName &&
        /\.(jpg|jpeg|png|gif|webp|avif|heic|heif|svg)$/i.test(media.fileName)));

  // ---------- 1. PRELOAD ON ALMOST FOCUSED (background seed, no render) ----------
  useEffect(() => {
    if (!isAlmostFocused || isFocused) return;
    if (!media?.magnetLink) return;

    let cancelled = false;

    const warm = async () => {
      try {
        await getOrStartTorrent(media.magnetLink, media.cid, media);
        if (!cancelled) console.log(`🔥 Prewarming ${media.cid?.slice(0, 8)}`);
      } catch (err) {
        if (!cancelled) console.log("Prewarm skip:", err.message);
      }
    };

    warm();
    return () => {
      cancelled = true;
    };
  }, [isAlmostFocused, isFocused, media?.magnetLink, media?.cid]);

  // ---------- 2. LOAD WHEN FOCUSED ----------
  useEffect(() => {
    if (!isFocused) return;
    if (!media) return;

    isMountedRef.current = true;
    let localObjectUrl = null;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Direct URL fast path
        if (media.url || media.uri) {
          if (!isMountedRef.current) return;
          setMediaUrl(media.url || media.uri);
          setLoading(false);
          setStatus("direct");
          return;
        }

        // Cached blob (fastest P2P-adjacent path)
        if (media.cid) {
          try {
            const cached = await getMedia(media.cid);
            if (cached?.blob && isMountedRef.current) {
              const url = URL.createObjectURL(cached.blob);
              objectUrlRef.current = url;
              setMediaUrl(url);
              setStatus("cached");
              setLoading(false);
              return;
            }
          } catch (_) {}
        }

        // P2P with HTTP fallback
        const result = await getMediaWithFallback(media, (s) => {
          if (isMountedRef.current) setStatus(s);
        });

        if (!isMountedRef.current) return;

        if (typeof result === "string") {
          setMediaUrl(result);
        } else if (result?.url) {
          setMediaUrl(result.url);
        } else {
          throw new Error("Unsupported media result");
        }

        setLoading(false);
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message || "Failed to load media");
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMountedRef.current = false;
      if (localObjectUrl && Platform.OS === "web") {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [isFocused, media?.cid, media?.magnetLink, media?.url, media?.uri]);

  // ---------- 3. AUTO-PLAY / PAUSE ON FOCUS (mobile-safe) ----------
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const video = videoRef.current;
    if (!video || !video.play) return;

    // Always ensure these are set — mobile browsers require them for autoplay
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");

    if (isFocused && mediaUrl) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch((err) => {
          console.log(
            "Autoplay blocked, waiting for user gesture:",
            err.message,
          );
        });
      }
    } else {
      video.pause();
    }
  }, [isFocused, mediaUrl]);

  // ---------- RENDER ----------

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (loading || !mediaUrl) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF00FF" />
        <Text style={styles.statusText}>
          {status === "connecting_p2p" && "📡 Connecting to peers..."}
          {status === "p2p_streaming" && `🌪️ Swarming (${progress}%)`}
          {status === "fallback_http" && "🌍 Loading via CDN..."}
          {status === "cached" && "📦 Loading from cache..."}
          {(!status || status === "idle") && "⏳ Preparing media..."}
        </Text>
      </View>
    );
  }

  if (isVideo && Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <video
          ref={videoRef}
          src={mediaUrl}
          controls
          muted
          loop
          playsInline
          // @ts-ignore — RN Web passes these through to DOM
          webkit-playsinline="true"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            backgroundColor: "#000",
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: mediaUrl }}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#130720",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  errorText: {
    color: "#FF4444",
    fontSize: 14,
    textAlign: "center",
  },
  statusText: {
    color: "#FFF",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
});
