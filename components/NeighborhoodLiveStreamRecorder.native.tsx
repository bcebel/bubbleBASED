// components/NeighborhoodLiveStreamRecorder.native.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import * as FileSystem from "expo-file-system";
import { useMutation, gql } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import webtorrentService from "../utils/webtorrentService";

const BACKEND_URL = process.env.EXPO_PUBLIC_HEROKU_URL;

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

  const recordLoop = async () => {
    if (!isRecordingRef.current || !cameraRef.current) return;

    try {
      setIsProcessing(true);

      // 3. Record a 4-second chunk (matching your web version)
      const video = await cameraRef.current.recordAsync({ maxDuration: 4 });
      if (!video || !video.uri) throw new Error("No video recorded");

      const currentIndex = chunkIndexRef.current;

      // 4. Read the file into a Blob so WebTorrent can seed it
      const response = await fetch(video.uri);
      const blob = await response.blob();

      // 5. Seed the chunk via WebTorrent
      const seedResult = await webtorrentService.seed(blob, {
        name: `chunk_${sessionIdRef.current}_${currentIndex}.mp4`,
      });

      // 6. Tell the database about the new chunk
      await sendChunk({
        variables: {
          content: currentIndex === 0 ? "STREAM_HEADER" : "",
          neighborhoodId,
          magnetLink: seedResult.magnetLink,
          fileType: currentIndex === 0 ? "video_header" : "video_chunk",
          sessionId: sessionIdRef.current,
          chunkIndex: currentIndex === 0 ? -1 : currentIndex,
        },
      });

      // 7. Cleanup the local file
 const file = new FileSystem.File(video.uri);
 if (file.exists) {
   file.delete();
 }

      setChunkCount((prev) => prev + 1);
      chunkIndexRef.current += 1;
      setIsProcessing(false);

      // 8. Loop back and record the next 4 seconds
      if (isRecordingRef.current) {
        recordLoop();
      }
    } catch (error) {
      console.error("Error in recording loop:", error);
      setIsProcessing(false);
      if (isRecordingRef.current) {
        // If it fails, wait 1 second and try again
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
