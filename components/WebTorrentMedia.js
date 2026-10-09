// WebTorrentMedia.js
import React, { useState, useEffect, useRef } from "react";
import { useEventListener } from "expo";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useVideoPlayer, VideoView, useCaching } from "expo-video";
import { getMedia } from "./mediaCache";
import { enqueueDownload } from "./downloadQueue";
import { Image } from "expo-image";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const DEBUG = true;
let globalMuted = true;
let globalVolume = 1.0;

function FocusedVideo({ src }) {
  const videoSource = {
    uri: src,
    useCaching: true,
  };
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = globalMuted;
    p.volume = globalVolume;
      p.play();   
  });

  useEventListener(player, "mutedChange", ({ muted }) => {
    globalMuted = muted;
  });

  useEventListener(player, "volumeChange", ({ volume }) => {
    globalVolume = volume;
  });

 useEffect(() => {
   if (!player) return;
   try {
     player.muted = true;
     player.play();
   } catch (err) {
     console.log("[video] play failed:", err);
   }
 }, [player]);

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls={true}
      fullscreenOptions={{ enable: false }}
      allowsPictureInPicture={false}
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
    if (!isFocused || !media?.cid) return;

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

      // 1. cache hit → play from blob, done.
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

      if (cancelled) return;

      // 2. miss → play HTTP fallback immediately, enqueue background cache
      setVideoSrc(`${BACKEND_URL}/api/webseed/${media.cid}`);
      setStatus("fallback_http");
      setIsReady(true);

      // fire-and-forget; queue handles P2P + HTTP race internally
      const priority = isFocused ? 0 : isAlmostFocused ? 2 : 5;
      enqueueDownload(media.cid, media, priority).catch((err) => {
        if (DEBUG)
          console.log("[wtm] enqueue rejected", media.cid, err.message);
      });
    };

    load();

    return () => {
      cancelled = true;
      for (const url of ownedBlobsRef.current) {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
          if (DEBUG) console.log("[wtm] revoked", url, "for", media.cid);
        }
      }
      ownedBlobsRef.current = [];
    };
  }, [isFocused, media?.cid]);

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
    return (
      <img
        src={videoSrc}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        alt=""
      />
    )
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
