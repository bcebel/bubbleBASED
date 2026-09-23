// WebTorrentMedia.js - ULTIMATE CACHING VERSION (Background Cache)
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  Text,
  Platform,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { getMediaWithFallback } from "./torrentmanager";

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

const pinataCache = new Map();

if (typeof window !== "undefined") {
  window.__pinataCache = pinataCache;
}

export default function WebTorrentMedia({ media, isFocused, isAlmostFocused }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrlToRevoke = null;

    if (!media) return;

    const loadMedia = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Direct URL/URI fast path
        if (media.url || media.uri) {
          if (isMounted) {
            setMediaUrl(media.url || media.uri);
            setLoading(false);
          }
          return;
        }

        // 2. Fetch via fallback pipeline
        const result = await getMediaWithFallback(media);

        if (!isMounted) return;

        if (!result) {
          setError("Media unavailable");
          setLoading(false);
          return;
        }

        // 3. Resolve result format
        let resolvedUrl = null;

        if (typeof result === "string") {
          resolvedUrl = result;
        } else if (result.url || result.uri) {
          resolvedUrl = result.url || result.uri;
        } else if (result instanceof Blob) {
          resolvedUrl = URL.createObjectURL(result);
          objectUrlToRevoke = resolvedUrl;
        } else if (result.getBlob) {
          result.getBlob((err, blob) => {
            if (!isMounted) return;
            if (err || !blob || blob.size === 0) {
              setError("Torrent file buffer empty");
              setLoading(false);
              return;
            }
            try {
              const url = URL.createObjectURL(blob);
              objectUrlToRevoke = url;
              setMediaUrl(url);
              setLoading(false);
            } catch (e) {
              setError("Blob URL creation failed");
              setLoading(false);
            }
          });
          return;
        } else if (result.files && result.files.length > 0) {
          const file =
            result.files.find(
              (f) =>
                f.name.endsWith(".mp4") ||
                f.name.endsWith(".jpg") ||
                f.name.endsWith(".png") ||
                f.name.endsWith(".webp"),
            ) || result.files[0];

          if (file && file.getBlob) {
            file.getBlob((err, blob) => {
              if (!isMounted) return;
              if (err || !blob) {
                setError("Torrent file blob error");
                setLoading(false);
                return;
              }
              try {
                const url = URL.createObjectURL(blob);
                objectUrlToRevoke = url;
                setMediaUrl(url);
                setLoading(false);
              } catch (e) {
                setError("Blob URL creation failed");
                setLoading(false);
              }
            });
            return;
          }
        }

        if (resolvedUrl) {
          setMediaUrl(resolvedUrl);
          setLoading(false);
        } else {
          setError(`Unsupported media format: ${typeof result}`);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Error loading media");
          setLoading(false);
        }
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
      if (objectUrlToRevoke && Platform.OS === "web") {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [media?.cid, media?.id]);

  // Sync video play/pause on focus change
  useEffect(() => {
    if (Platform.OS === "web" && videoRef.current) {
      if (isFocused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isFocused]);

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
      </View>
    );
  }

  // Detect video by fileType property or file extension fallback
  const isVideo =
    media?.fileType === "video" ||
    media?.mediaType === "video" ||
    (media?.fileName && /\.(mp4|mov|webm|avi|mkv)$/i.test(media.fileName));

  if (isVideo && Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <video
          ref={videoRef}
          src={mediaUrl}
          controls
          autoPlay={isFocused}
          muted={true}
          loop
          playsInline
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
  },
});
