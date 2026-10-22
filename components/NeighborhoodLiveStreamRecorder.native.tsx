// components/NeighborhoodLiveStreamRecorder.native.tsx
import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { useMutation, gql } from "@apollo/client";
import webtorrentService from "../utils/webtorrentService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Blob } from "expo-blob";

const BACKEND_URL = process.env.EXPO_PUBLIC_HEROKU_URL;

const IS_IOS = Platform.OS === "ios";
const IS_ANDROID = Platform.OS === "android";

const CREATE_STREAM = gql`
  mutation CreateStream($title: String!, $neighborhoodId: ID!) {
    createStream(title: $title, neighborhoodId: $neighborhoodId) {
      id
      sessionId
    }
  }
`;

const SEND_CHUNK = gql`
  mutation SendNeighborhoodMessage(
    $content: String!
    $neighborhoodId: ID!
    $magnetLink: String
    $fileType: String
    $sessionId: String
    $chunkIndex: Int
  ) {
    sendMessage(
      content: $content
      neighborhoodId: $neighborhoodId
      room: "neighborhood"
      magnetLink: $magnetLink
      fileType: $fileType
      sessionId: $sessionId
      chunkIndex: $chunkIndex
    ) {
      id
    }
  }
`;

/**
 * Reads a local video file into a Blob.
 *
 * - iOS: original behavior — fetch(file://) → blob. This is the exact path
 *   that is validated working in production. Do not change.
 * - Android: fetch(file://) is unreliable (returns empty blob or throws) so
 *   we read base64 via expo-file-system and build the Blob from a Uint8Array.
 */
async function readVideoAsBlob(uri) {
  if (IS_IOS) {
    const response = await fetch(uri);
    return await response.blob();
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Return an object with base64Data, NOT a Blob
  return {
    base64Data: base64,
    type: "video/mp4",
  };
}

/**
 * Deletes the temp recording file.
 *
 * - iOS: original behavior — FileSystem.File API if present, else no-op.
 * - Android: FileSystem.deleteAsync (File API may not exist on older SDKs).
 */
async function deleteTempFile(uri) {
  if (IS_IOS) {
    try {
      const file = new FileSystem.File(uri);
      if (file.exists) file.delete();
    } catch {
      // preserve original silent behavior
    }
    return;
  }
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {}
}


async function secureVideoFile(uri) {
  const safeDir = FileSystem.cacheDirectory + "live-chunks/";
  const dirInfo = await FileSystem.getInfoAsync(safeDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(safeDir, { intermediates: true });
  }

  const safeUri = safeDir + `chunk-${Date.now()}.mp4`;

  // Ensure the source URI has the file:// prefix
  const sourceUri = uri.startsWith("file://") ? uri : `file://${uri}`;

  await FileSystem.copyAsync({ from: sourceUri, to: safeUri });
  return safeUri;
}

const uploadToBackend = async (chunkData, index, sessionId, retry = 0) => {
  try {
    const token = await AsyncStorage.getItem("token");
    let res;

    if (IS_IOS) {
      // iOS: FormData to the normal route
      const formData = new FormData();
      formData.append("chunk", chunkData, `chunk-${index}.mp4`);
      formData.append("sessionId", sessionId);
      formData.append("chunkIndex", index.toString());
      formData.append("rotation", "0");

      res = await fetch(`${BACKEND_URL}/api/live-chunk`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
    } else {
      // Android: JSON to the native route
      const base64String = chunkData.base64Data;

      if (!base64String) {
        console.error("❌ [uploadToBackend] No base64 data available!");
        return null;
      }

      res = await fetch(`${BACKEND_URL}/api/live-chunk-native`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId,
          chunkIndex: index,
          rotation: 0,
          base64: base64String,
        }),
      });
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(
        `[uploadToBackend] ${index} failed: ${res.status}`,
        errorText,
      );
      return null;
    }

    return await res.json();
  } catch (e) {
    if (retry < 2)
      return uploadToBackend(chunkData, index, sessionId, retry + 1);
    console.error(`[uploadToBackend] ${index} network error`, e);
    return null;
  }
};

export default function NeighborhoodLiveStreamRecorder({
  neighborhoodId,
  username,
  onStreamEnd,
}) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);

  const cameraRef = useRef(null);
  const isRecordingRef = useRef(false);
  const sessionIdRef = useRef("");
  const chunkIndexRef = useRef(0);

  // Android-only guard: prevents overlapping recordAsync calls
  // (CameraX throws "Already recording" if called before the previous
  // recording fully releases the encoder). Not used on iOS.
  const isBusyRef = useRef(false);

  const [createStream] = useMutation(CREATE_STREAM);
  const [sendChunk] = useMutation(SEND_CHUNK);

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          We need camera and microphone access to stream.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>Grant Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={requestMicPermission}>
          <Text style={styles.buttonText}>Grant Microphone</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startStream = async () => {
    try {
      setIsProcessing(true);

      // 1. Create the stream session in the database
      const { data } = await createStream({
        variables: { title: `${username}'s Live`, neighborhoodId },
      });
      sessionIdRef.current = data.createStream.sessionId;
      chunkIndexRef.current = 0;

      setIsStreaming(true);
      isRecordingRef.current = true;
      setIsProcessing(false);

      // 2. Start the recording loop
      recordLoop();
    } catch (error) {
      console.error("Failed to start stream:", error);
      Alert.alert("Error", "Could not start the stream.");
      setIsProcessing(false);
    }
  };

  /**
   * Recursive recording loop.
   *
   * iOS   — original behavior unchanged (no busy guard, immediate recursion).
   * Android — busy guard + small inter-chunk delay + recordAsync options.
   */
  const recordLoop = async () => {
    if (!isRecordingRef.current || !cameraRef.current) return;

    if (IS_ANDROID && isBusyRef.current) return;
    if (IS_ANDROID) isBusyRef.current = true;

    try {
      setIsProcessing(true);

      let video: any; // 👈 Added : any to fix the TypeScript 'never' error
      if (IS_IOS) {
        video = await cameraRef.current.recordAsync({ maxDuration: 4 });
      } else {
        video = await cameraRef.current.recordAsync({
          maxDuration: 4,
          quality: "480p",
          codec: "avc1",
          mute: false,
        });
      }

      if (!video || !video.uri) throw new Error("No video recorded");

      // 🚨 1. Copy immediately (no logs or awaits before this)
      let safeUri;
      try {
        safeUri = await secureVideoFile(video.uri);
      } catch (copyError) {
        console.warn(
          "[rec] Immediate copy failed, trying fallback:",
          copyError.message,
        );
        // Fallback: try reading the original uri directly before it's gone
        safeUri = video.uri;
      }

      // 2. Now read from the safe copy
      const chunkData = await readVideoAsBlob(safeUri);
    console.log(
      `[rec] Chunk ${dbChunkIndex} size:`,
      chunkData.base64Data?.length || 0,
      "base64 chars",
    );
      
            const currentIndex = chunkIndexRef.current;
            const dbChunkIndex = currentIndex === 0 ? -1 : currentIndex - 1;

            // 3. Upload to backend
            const backendResult = await uploadToBackend(
              chunkData,
              dbChunkIndex,
              sessionIdRef.current,
            );

            const magnetLink = backendResult?.magnetUri;

            if (!magnetLink) {
              console.error(
                `[rec] No magnet link available for chunk ${dbChunkIndex}.`,
              );
              // Cleanup the safe file even on failure
              await deleteTempFile(safeUri);
              setIsProcessing(false);
              if (IS_ANDROID) isBusyRef.current = false;
              if (isRecordingRef.current) setTimeout(recordLoop, 1000);
              return;
            }

            // 4. Tell database
            await sendChunk({
              variables: {
                content: currentIndex === 0 ? "STREAM_HEADER" : "",
                neighborhoodId,
                magnetLink,
                fileType: currentIndex === 0 ? "video_header" : "video_chunk",
                sessionId: sessionIdRef.current,
                chunkIndex: dbChunkIndex,
              },
            });

            // 5. Delete the safe file now that we're done with it
            await deleteTempFile(safeUri);

      setChunkCount((prev) => prev + 1);
      chunkIndexRef.current += 1;
      setIsProcessing(false);

      if (IS_ANDROID) isBusyRef.current = false;

      // 5. Loop back
      if (isRecordingRef.current) {
        if (IS_IOS) {
          recordLoop();
        } else {
          setTimeout(recordLoop, 150);
        }
      }
    } catch (error) {
      console.error("Error in recording loop:", error);
      setIsProcessing(false);
      if (IS_ANDROID) isBusyRef.current = false;

      if (isRecordingRef.current) {
        setTimeout(recordLoop, 1000);
      }
    }
  };

  const stopStream = async () => {
    isRecordingRef.current = false;
    setIsStreaming(false);

    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }

    if (onStreamEnd) onStreamEnd();
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        mode="video"
        facing="back"
        onCameraReady={() => console.log("[camera] ready")}
        onMountError={(e) => console.log("[camera] mount error:", e.message)}
      />

      <View style={styles.overlay}>
        {!isStreaming ? (
          <TouchableOpacity
            style={[styles.button, styles.startBtn]}
            onPress={startStream}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                🔴 CLICK to START LIVE STREAM
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopBtn]}
            onPress={stopStream}
          >
            <Text style={styles.buttonText}>⏹️ STOP</Text>
          </TouchableOpacity>
        )}

        {isStreaming && (
          <Text style={styles.statusText}>
            📡 Streaming: {chunkCount} chunks{" "}
            {isProcessing ? "(uploading...)" : ""}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  camera: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  text: { color: "#fff", textAlign: "center", marginBottom: 20 },
  overlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 10,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  startBtn: { backgroundColor: "#ff375f" },
  stopBtn: { backgroundColor: "#444" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  statusText: {
    color: "#00ffff",
    marginTop: 15,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
});
