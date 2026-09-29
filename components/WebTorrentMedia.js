// WebTorrentMedia.js
import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { getMedia } from "../components/mediaCache";
import { getMagnetForCid } from "../utils/magnetCache";
import { getOrStartTorrent } from "./torrentmanager";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const DEBUG = true;

function FocusedVideo({ src }) {
  const player = useVideoPlayer(src, (p) => {
    p.loop = true;
    p.muted = true;
  });
  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
    />
  );
}

export default function WebTorrentMedia({ media, isFocused, isAlmostFocused }) {
  const [videoSrc, setVideoSrc] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("idle");

  const ownedBlobsRef = useRef([]);

  const isImage =
    media?.fileType === "image" ||
    media?.mediaType === "image" ||
    media?.fileName?.match(/\.(jpg|jpeg|png|gif|webp|avif|heic|heif|svg)$/i);

  useEffect(() => {
    if (!isFocused || !media) return;

    let cancelled = false;

    const makeBlobUrl = (blob) => {
      const url = URL.createObjectURL(blob);
      ownedBlobsRef.current.push(url);
      if (DEBUG) console.log("[wtm] minted", url, "for", media.cid);
      return url;
    };

    const load = async () => {
      setIsReady(false);
      setVideoSrc(null);

      // 1. cache
      try {
        const cached = await getMedia(media.cid);
        if (cancelled) return;
        if (cached?.blob) {
          setVideoSrc(makeBlobUrl(cached.blob));
          setStatus("cached");
          setIsReady(true);
          return;
        }
      } catch (_) {}

      // 2. magnet
      const magnetLink = media.magnetLink || (await getMagnetForCid(media.cid));
      if (cancelled) return;

      if (!magnetLink) {
        setVideoSrc(`https://bubblebased.com/api/webseed/${media.cid}`);
        setStatus("fallback_http");
        setIsReady(true);
        return;
      }

      // 3. torrent
      setStatus("connecting_p2p");
      const record = await getOrStartTorrent(
        magnetLink,
        media.cid,
        media,
      ).catch(() => null);
      if (cancelled) return;

      const client =
        typeof window !== "undefined" ? window.globalWebTorrentClient : null;
      const hasServer = !!client?._server;
      const hasMetadata = record?.torrent?.ready;
      const file = record?.torrent?.files?.[0];

      if (!isImage && hasServer && hasMetadata && file) {
        setVideoSrc(file.streamURL);
        setStatus("p2p_streaming");
        setIsReady(true);
        return;
      }

      // 4. fallback
      setVideoSrc(`https://bubblebased.com/api/webseed/${media.cid}`);
      setStatus("fallback_http");
      setIsReady(true);
    };

    load();

    return () => {
      cancelled = true;
      const urls = ownedBlobsRef.current;
      for (const url of urls) {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
          if (DEBUG) console.log("[wtm] revoked", url, "for", media.cid);
        }
      }
      ownedBlobsRef.current = [];
    };
  }, [isFocused, media?.cid, media?.magnetLink]);

  if (!isFocused) return null;

  if (!videoSrc || !isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>
          {status === "connecting_p2p" ? "Connecting…" : "Loading…"}
        </Text>
      </View>
    );
  }

  if (isImage) {
    return <img src={videoSrc} style={styles.image} alt="" />;
  }

  return (
    <View style={styles.container}>
      <FocusedVideo src={videoSrc} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", height: "100%", backgroundColor: "#000" },
  video: { width: "100%", height: "100%" },
  image: { width: "100%", height: "100%", objectFit: "contain" },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
  },
  statusText: { color: "#fff", marginTop: 10 },
});
