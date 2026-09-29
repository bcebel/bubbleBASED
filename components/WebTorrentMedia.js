import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { getMedia } from "../components/mediaCache";
import { getMagnetForCid } from "../utils/magnetCache";
import { getOrStartTorrent } from "./torrentmanager";

function VideoPlayer({ src }) {
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

  const isImage =
    media?.fileType === "image" ||
    media?.mediaType === "image" ||
    media?.fileName?.match(/\.(jpg|jpeg|png|gif|webp|avif|heic|heif|svg)$/i);

  const player = useVideoPlayer(videoSrc, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (!isFocused || !media) return;

    let cancelled = false;

    const load = async () => {
      // 1. cache
      const cached = await getMedia(media.cid);
      if (cancelled) return;
      if (cached?.blob) {
        setVideoSrc(URL.createObjectURL(cached.blob));
        setIsReady(true);
        return;
      }

      // 2. torrent metadata
      const magnetLink = media.magnetLink || (await getMagnetForCid(media.cid));
      if (!magnetLink) {
        setVideoSrc(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/webseed/${media.cid}`,
        );
        setIsReady(true);
        return;
      }

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
        setIsReady(true);
        return;
      }

      // fallback
      setVideoSrc(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/webseed/${media.cid}`,
      );
      setIsReady(true);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isFocused, media?.cid]);

  if (!isFocused) return null;

  if (!videoSrc || !isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>Loading...</Text>
      </View>
    );
  }

  if (isImage) {
    return <img src={videoSrc} style={styles.image} alt="" />;
  }

  return (
    <View style={styles.container}>
       <VideoPlayer src={videoSrc} />;
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
