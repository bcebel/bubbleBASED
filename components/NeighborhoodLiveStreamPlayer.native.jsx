// --- THE  WHOLE POINT OF THIS FILE IS TO PROVIDE A LIVE STREAM PLAYER THAT USES WEBTORRENT TO STREAM VIDEO CHUNKS FROM A P2P NETWORK --- //
// DONT DEFAULT TO SERVER VIDEO. INSTEAD, USE WEBTORRENT TO PULL VIDEO CHUNKS FROM PEERS. USE SERVER AS FALLBACK ONLY IF NO PEERS HAVE THE DATA READILY AVAILABLE. //
// KEEP TORRENTS ALIVE AS LONG AS POSSIBLE WITHOUT OVERLOADING THE BROWSER. USE A WAREHOUSE TO CACHE VIDEO CHUNKS LOCALLY. //

import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { warehouse } from "../components/StreamWearhouse.js";
import webtorrentService from "../utils/webtorrentService.js";
import { WebView } from "react-native-webview";
import Slider from "@react-native-community/slider";
const BACKEND_URL = process.env.EXPO_PUBLIC_HEROKU_URL;



export default function NeighborhoodLiveStreamPlayer({
  sessionId,
  initialChunks = [],
  availableInWarehouse = [],
  onThumbnailLoaded,
  rotation = 0,
}) {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const [isJoined, setIsJoined] = useState(false);
  const [logs, setLogs] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);

  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0);

  const addLog = (msg) => {
    setLogs((prev) => [...prev.slice(-5), msg]);
    console.log(`[Stream] ${msg}`);
  };


  useEffect(() => {
    if (initialChunks.length > 0) {
      initialChunks.forEach((chunk) => {
        if (chunk.thumbnailUrl && !thumbnail) {
          setThumbnail(chunk.thumbnailUrl);
          if (onThumbnailLoaded) onThumbnailLoaded(chunk.thumbnailUrl);
        }
      });
    }
  }, [initialChunks]);

  useEffect(() => {
    if (controllerRef.current && onThumbnailLoaded) {
      controllerRef.current.onThumbnailLoaded = (thumbnailUrl) => {
        setThumbnail(thumbnailUrl);
        if (onThumbnailLoaded) onThumbnailLoaded(thumbnailUrl);
      };
    }
  }, [onThumbnailLoaded]);

  useEffect(() => {
    if (isJoined && controllerRef.current) controllerRef.current.forceTick();
  }, [availableInWarehouse]);

  useEffect(() => {
    if (isJoined && controllerRef.current) {
      if (initialChunks.length > 0)
        controllerRef.current.addChunks(initialChunks);
      controllerRef.current.tick();
    }
  }, [isJoined, initialChunks, availableInWarehouse]);

  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      // Try to fetch the next chunk from the server directly
      // regardless of whether the subscription delivered it
      const nextIdx = controllerRef.current?.nextIndex;
      if (nextIdx == null) return;

      try {
        const res = await fetch(
          `${BACKEND_URL}/api/live-chunk/${sessionId}/${nextIdx}`,
        );
        if (res.ok) {
          const bytes = await res.arrayBuffer();
          await warehouse.saveChunk(sessionId, nextIdx, new Uint8Array(bytes));
          controllerRef.current.forceTick();
        }
      } catch (e) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const handleTogglePlay = () => {
    if (controllerRef.current?.video) {
      const video = controllerRef.current.video;
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  };

  const handleSkip = (seconds) => {
    if (controllerRef.current?.video)
      controllerRef.current.video.currentTime += seconds;
  };

  const handleTimelineScrub = (e) => {
    if (controllerRef.current?.video) {
      const targetTime = parseFloat(e.target.value);
      controllerRef.current.video.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleVolumeChange = (e) => {
    if (controllerRef.current?.video) {
      const targetVolume = parseFloat(e.target.value);
      controllerRef.current.video.volume = targetVolume;
      controllerRef.current.video.muted = targetVolume === 0;
      setVolume(targetVolume);
    }
  };

  const getVolumeIcon = () => {
    if (volume === 0) return "🔇";
    if (volume < 0.4) return "🔈";
    if (volume < 0.7) return "🔉";
    return "🔊";
  };
   const webViewRef = useRef(null);

   // We can listen for messages from the WebView to update our Native UI
   const onWebViewMessage = (event) => {
     try {
       const data = JSON.parse(event.nativeEvent.data);
       if (data.type === "TIME_UPDATE") setCurrentTime(data.time);
       if (data.type === "DURATION_UPDATE") setDuration(data.duration);
       if (data.type === "PLAY_STATE") setIsPaused(data.isPaused);
     } catch (e) {}
   };

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {/* We use a WebView to handle the actual WebTorrent/MediaSource playback */}
        <WebView
          ref={webViewRef}
          source={{
            uri: `https://ebubbl.com/livestream-player-only/${sessionId}`,
          }} // 👈 You need a barebones web page for this
          style={{ flex: 1, backgroundColor: "black" }}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onMessage={onWebViewMessage}
          originWhitelist={["*"]}
        />
      </View>

      <View style={styles.controlsOverlay}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() =>
              webViewRef.current?.injectJavaScript("window.skip(-10); true;")
            }
          >
            <Text style={styles.controlButtonText}>⏪</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() =>
              webViewRef.current?.injectJavaScript("window.togglePlay(); true;")
            }
          >
            <Text style={styles.controlButtonText}>{isPaused ? "▶" : "⏸"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() =>
              webViewRef.current?.injectJavaScript("window.skip(10); true;")
            }
          >
            <Text style={styles.controlButtonText}>⏩</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.slidersRow}>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.timelineSlider}
              minimumValue={0}
              maximumValue={duration || 100}
              value={currentTime}
              onSlidingComplete={(val) =>
                webViewRef.current?.injectJavaScript(
                  `window.seek(${val}); true;`,
                )
              }
              minimumTrackTintColor="#ffffff"
              maximumTrackTintColor="#888888"
              thumbTintColor="#ffffff"
            />
          </View>

          <View style={styles.volumeContainer}>
            <Text style={styles.volumeIcon}>
              {volume === 0
                ? "🔇"
                : volume < 0.4
                  ? "🔈"
                  : volume < 0.7
                    ? "🔉"
                    : "🔊"}
            </Text>
            <Slider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={(val) =>
                webViewRef.current?.injectJavaScript(
                  `window.setVolume(${val}); true;`,
                )
              }
              minimumTrackTintColor="#ffffff"
              maximumTrackTintColor="#888888"
              thumbTintColor="#ffffff"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingBottom: 100,
  },
  videoContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: "#130720",
  },
  controlsOverlay: {
    width: "100%",
    padding: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 25,
    marginBottom: 15,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  slidersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    width: "100%",
  },
  sliderContainer: {
    flex: 2,
  },
  timelineSlider: {
    width: "100%",
    height: 40,
  },
  volumeContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 120,
  },
  volumeIcon: {
    fontSize: 16,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
});