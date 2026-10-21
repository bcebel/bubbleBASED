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
import * as FileSystem from "expo-file-system";
import { useMutation, gql } from "@apollo/client";
import webtorrentService from "../utils/webtorrentService";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    // === iOS: preserve the known-good path ===
    const response = await fetch(uri);
    return await response.blob();
  }

  // === Android: base64 -> Uint8Array -> Blob ===
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: "video/mp4" });
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

const uploadToBackend = async (chunkBytes, index, sessionId, retry = 0) => {
  try {
    const formData = new FormData();
    formData.append("chunk", new Blob([chunkBytes], { type: "video/mp4" }));
    formData.append("sessionId", sessionId);
    formData.append("chunkIndex", index.toString());
    formData.append("rotation", "0");

    const token = await AsyncStorage.getItem("token");
    const res = await fetch(`${BACKEND_URL}/api/live-chunk`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      console.warn(`[uploadToBackend] ${index} failed: ${res.status}`);
      return null;
    }
    return await res.json(); // { success, magnetUri, chunkId }
  } catch (e) {
    if (retry < 2) return uploadToBackend(chunkBytes, index, retry + 1);
    console.error(`[uploadToBackend] ${index} error`, e);
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

    // Android-only re-entrancy guard
    if (IS_ANDROID && isBusyRef.current) return;
    if (IS_ANDROID) isBusyRef.current = true;

    try {
      setIsProcessing(true);

      // 3. Record a 4-second chunk.
      //    iOS uses the original call unchanged.
      //    Android adds codec/quality/mute so the encoder is predictable.
      let video;
      if (IS_IOS) {
        video = await cameraRef.current.recordAsync({ maxDuration: 4 });
      } else {
        if (__DEV__) console.log("[rec][android] recordAsync start");
        video = await cameraRef.current.recordAsync({
          maxDuration: 4,
          quality: "480p",
          codec: "avc1",
          mute: false,
        });
        if (__DEV__) console.log("[rec][android] recordAsync done", video?.uri);
      }

      if (!video || !video.uri) throw new Error("No video recorded");

      const currentIndex = chunkIndexRef.current;

      // 4. Read the file into a Blob.
      //    iOS: fetch(file://) as before.
      //    Android: base64 -> Uint8Array -> Blob.
      let blob;
      if (IS_IOS) {
        const response = await fetch(video.uri);
        blob = await response.blob();
      } else {
        if (__DEV__) console.log("[rec][android] reading file");
        blob = await readVideoAsBlob(video.uri);
        if (__DEV__) console.log("[rec][android] blob size", blob.size);
      }

      // 5. Seed the chunk via WebTorrent
      if (__DEV__ && IS_ANDROID) console.log("[rec][android] seeding");
      const seedResult = await webtorrentService.seed(blob, {
        name: `livestream-${sessionIdRef.current}-${currentIndex === 0 ? "-1" : currentIndex}`,
      });
      if (__DEV__ && IS_ANDROID)
        console.log("[rec][android] seeded", seedResult?.magnetLink);

      // 5b. Upload to backend so the server seeds it too
      const backendResult = await uploadToBackend(
        blob,
        currentIndex,
        sessionIdRef.current,
      );

      // Prefer backend's magnet link (it has the reliable trackers)
      // Fall back to local seed if the upload failed
      const magnetLink = backendResult?.magnetUri || seedResult.magnetLink;

      // 6. Tell the database about the new chunk
      if (__DEV__ && IS_ANDROID) console.log("[rec][android] sendChunk");
      await sendChunk({
        variables: {
          content: currentIndex === 0 ? "STREAM_HEADER" : "",
          neighborhoodId,
          magnetLink,
          fileType: currentIndex === 0 ? "video_header" : "video_chunk",
          sessionId: sessionIdRef.current,
          chunkIndex: currentIndex === 0 ? -1 : currentIndex,
        },
      });

      if (__DEV__ && IS_ANDROID) console.log("[rec][android] chunk sent");

      // 7. Cleanup the local file
      //    iOS: original FileSystem.File path.
      //    Android: FileSystem.deleteAsync.
      await deleteTempFile(video.uri);

      setChunkCount((prev) => prev + 1);
      chunkIndexRef.current += 1;
      setIsProcessing(false);

      // Release the Android busy guard before scheduling the next chunk
      if (IS_ANDROID) isBusyRef.current = false;

      // 8. Loop back and record the next 4 seconds
      if (isRecordingRef.current) {
        if (IS_IOS) {
          // === iOS: original behavior — immediate recursion ===
          recordLoop();
        } else {
          // === Android: give CameraX time to release the encoder ===
          setTimeout(recordLoop, 150);
        }
      }
    } catch (error) {
      console.error("Error in recording loop:", error);
      setIsProcessing(false);
      if (IS_ANDROID) isBusyRef.current = false;

      if (isRecordingRef.current) {
        // Preserve original retry behavior on both platforms
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
  camera: { flex: 1 },
  text: { color: "#fff", textAlign: "center", marginBottom: 20 },
  overlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
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
