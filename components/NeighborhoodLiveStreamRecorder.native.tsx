import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
    $fileName: String
  ) {
    sendMessage(
      content: $content
      neighborhoodId: $neighborhoodId
      room: "neighborhood"
      magnetLink: $magnetLink
      fileType: $fileType
      sessionId: $sessionId
      chunkIndex: $chunkIndex
      fileName: $fileName
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
  const isBusyRef = useRef(false);

  const [createStream] = useMutation(CREATE_STREAM);
  const [sendChunk] = useMutation(SEND_CHUNK);

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need camera and microphone access.</Text>
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
      const { data } = await createStream({
        variables: { title: `${username}'s Live`, neighborhoodId },
      });
      sessionIdRef.current = data.createStream.sessionId;
      chunkIndexRef.current = 0;
      setIsStreaming(true);
      isRecordingRef.current = true;
      setIsProcessing(false);
      recordLoop();
    } catch (error) {
      Alert.alert("Error", "Could not start the stream.");
    }
  };

  const recordLoop = async () => {
    if (!isRecordingRef.current || !cameraRef.current) return;
    if (IS_ANDROID && isBusyRef.current) return;
    if (IS_ANDROID) isBusyRef.current = true;

    try {
      setIsProcessing(true);

      let video;
      if (IS_IOS) {
        video = await cameraRef.current.recordAsync({ maxDuration: 4 });
      } else {
        video = await cameraRef.current.recordAsync({
          maxDuration: 4,
          quality: "360p",
          codec: "avc1",
          mute: false,
        });
      }

      if (!video || !video.uri) throw new Error("No video recorded");

      const currentIndex = chunkIndexRef.current;
      const dbChunkIndex = currentIndex === 0 ? -1 : currentIndex - 1;

      // Read base64
      const base64 = await FileSystem.readAsStringAsync(video.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const cleanBase64 = base64.replace(/[\r\n]+/g, "");

      // Upload to native route
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/live-chunk-native`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          chunkIndex: dbChunkIndex,
          rotation: 0,
          base64: cleanBase64,
          mimeType: 'video/mp4; codecs="mp4a.40.2,avc1.4d4015"',
        }),
      });

      if (res.ok) {
        const result = await res.json();

        await sendChunk({
          variables: {
            content: currentIndex === 0 ? "STREAM_HEADER" : "",
            neighborhoodId,
            magnetLink: result.magnetUri,
            fileType: currentIndex === 0 ? "video_header" : "video_chunk",
            sessionId: sessionIdRef.current,
            chunkIndex: dbChunkIndex,
            fileName: `chunk-${dbChunkIndex}.mp4`,
          },
        });

        setChunkCount((prev) => prev + 1);
        chunkIndexRef.current += 1;
      }

      await FileSystem.deleteAsync(video.uri, { idempotent: true });
      setIsProcessing(false);
      if (IS_ANDROID) isBusyRef.current = false;

      if (isRecordingRef.current) {
        if (IS_IOS) recordLoop();
        else setTimeout(recordLoop, 150);
      }
    } catch (error) {
      setIsProcessing(false);
      if (IS_ANDROID) isBusyRef.current = false;
      if (isRecordingRef.current) setTimeout(recordLoop, 1000);
    }
  };

  const stopStream = async () => {
    isRecordingRef.current = false;
    setIsStreaming(false);
    if (cameraRef.current) cameraRef.current.stopRecording();
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
              <Text style={styles.buttonText}>🔴 START LIVE STREAM</Text>
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
            📡 Streaming: {chunkCount} chunks
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
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
  },
  startBtn: { backgroundColor: "#ff375f" },
  stopBtn: { backgroundColor: "#444" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  statusText: { color: "#00ffff", marginTop: 15, fontWeight: "bold" },
});
