//native recorder

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
} from "react-native";
import { WebView } from "react-native-webview";
import { useMutation, gql } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const webViewRef = useRef(null);
  const sessionIdRef = useRef("");

  const [createStream] = useMutation(CREATE_STREAM);
  const [sendChunk] = useMutation(SEND_CHUNK);

  const handlePermissionRequest = async (event) => {
    const { request } = event.nativeEvent;
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      const hasCamera =
        granted["android.permission.CAMERA"] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const hasAudio =
        granted["android.permission.RECORD_AUDIO"] ===
        PermissionsAndroid.RESULTS.GRANTED;
      if (hasCamera && hasAudio) request.grant(request.resources);
      else request.deny();
    } catch (err) {
      request.deny();
    }
  };

  const startStream = async () => {
    try {
      const { data } = await createStream({
        variables: { title: `${username}'s Live`, neighborhoodId },
      });
      sessionIdRef.current = data.createStream.sessionId;
      setIsStreaming(true);
         const token = await AsyncStorage.getItem("token");

      // 🚨 CALL THE FUNCTION DIRECTLY
      // Inside your startStream function in React Native (NeighborhoodLiveStreamRecorder.android.tsx):
webViewRef.current?.injectJavaScript(`
  if (window.startRecording) {
    window.startRecording("${sessionIdRef.current}", "${token}"); // 👈 Separate them properly!
  } else {
    console.error("startRecording is not defined yet");
  }
  true;
`);
      
    } catch (error) {
      Alert.alert("Error", "Could not start the stream.");
    }
  };

      
  const stopStream = () => {
    setIsStreaming(false);
    webViewRef.current?.injectJavaScript(`
      window.postMessage(JSON.stringify({ action: "stop" }), "*");
      true;
    `);
    if (onStreamEnd) onStreamEnd();
  };

   const onMessage = async (event) => {
     try {
       const data = JSON.parse(event.nativeEvent.data);

       if (data.type === "CHUNK") {
         // Upload to backend (for fallback and database record)
         const token = await AsyncStorage.getItem("token");
         console.log(
           "🔑 Token being sent to live-chunk-native:",
           token
             ? "Token exists (" + token.substring(0, 10) + "...)"
             : "❌ NO TOKEN FOUND",
         );
         const res = await fetch(`${BACKEND_URL}/api/live-chunk-native`, {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             ...(token ? { Authorization: `Bearer ${token}` } : {}),
           },
           body: JSON.stringify({
             sessionId: sessionIdRef.current,
             chunkIndex: data.index,
             rotation: 0,
             base64: data.base64,
             mimeType: data.mimeType,
           }),
         });

         if (res.ok) {
           const result = await res.json();

           // 🚨 Use the local WebTorrent magnet link if available
           const finalMagnet = data.magnetURI || result.magnetUri;

           await sendChunk({
             variables: {
               content: data.index === -1 ? "STREAM_HEADER" : "",
               neighborhoodId,
               magnetLink: finalMagnet, // 👈 Use the local peer's magnet link
               fileType: data.index === -1 ? "video_header" : "video_chunk",
               sessionId: sessionIdRef.current,
               chunkIndex: data.index,
               fileName: `chunk-${data.index}.mp4`,
             },
           });
           setChunkCount((prev) => prev + 1);
         }
       }
     } catch (e) {
       console.error("WebView Message Error:", e);
     }
   };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: "https://ebubbl.com/recorder.html" }}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowingReadAccessToURL="*"
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        androidLayerType="hardware"
        onPermissionRequest={handlePermissionRequest}
        onMessage={onMessage}
        style={{ flex: 1 }}
      />
      <View style={styles.overlay}>
        {!isStreaming ? (
          <TouchableOpacity style={styles.button} onPress={startStream}>
            <Text style={styles.buttonText}>🔴 START LIVE STREAM</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#444" }]}
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
  overlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  button: {
    backgroundColor: "#ff375f",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  statusText: { color: "#00ffff", marginTop: 15, fontWeight: "bold" },
});
