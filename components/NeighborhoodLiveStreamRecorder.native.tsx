import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { useMutation, gql } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform, PermissionsAndroid } from "react-native";

const askPermissions = async () => {
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    return (
      granted["android.permission.CAMERA"] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      granted["android.permission.RECORD_AUDIO"] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    return false;
  }
};

const BACKEND_URL = process.env.EXPO_PUBLIC_HEROKU_URL;

// 1. Add the GraphQL mutation back at the top
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

const CREATE_STREAM = gql`
  mutation CreateStream($title: String!, $neighborhoodId: ID!) {
    createStream(title: $title, neighborhoodId: $neighborhoodId) {
      id
      sessionId
    }
  }
`;

// The HTML page that will run inside the WebView
const recorderHTML = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body { margin: 0; padding: 0; background: black; overflow: hidden; }
        video { width: 100vw; height: 100vh; object-fit: cover; }
      </style>
    </head>
    <body>
      <video id="preview" autoplay playsinline muted></video>
      <script>
        let mediaRecorder;
        let chunkIndex = 0;
        
        async function startRecording() {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: 640, height: 480, frameRate: 30 },
              audio: true
            });
            
            document.getElementById("preview").srcObject = stream;
            
            // Use WebM if supported, otherwise fallback to MP4
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
              ? 'video/webm;codecs=vp8,opus' 
              : 'video/mp4';

            mediaRecorder = new MediaRecorder(stream, { mimeType });

            mediaRecorder.ondataavailable = async (e) => {
              if (e.data.size > 0) {
                const reader = new FileReader();
                reader.readAsDataURL(e.data);
                reader.onloadend = () => {
                  const base64data = reader.result.split(',')[1];
                  const index = chunkIndex === 0 ? -1 : chunkIndex - 1;
                  
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: "CHUNK",
                    index: index,
                    base64: base64data,
                    mimeType: mimeType
                  }));
                  
                  chunkIndex++;
                };
              }
            };

            mediaRecorder.start(4000); // 4 second chunks
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "STARTED" }));
          } catch (err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: err.message }));
          }
        }

        function stopRecording() {
          if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
          }
        }
      </script>
    </body>
  </html>
`;

export default function NeighborhoodLiveStreamRecorder({
  neighborhoodId,
  username,
  onStreamEnd,
}) {
  const [sendChunk] = useMutation(SEND_CHUNK);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const webViewRef = useRef(null);
  const sessionIdRef = useRef("");

  const [createStream] = useMutation(CREATE_STREAM);

  // Handle WebView permissions (Camera/Mic)
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

      if (hasCamera || hasAudio) {
        request.grant(request.resources);
      } else {
        request.deny();
      }
    } catch (err) {
      request.deny();
    }
  };

  const startStream = async () => {
    const hasPermissions = await askPermissions();
    if (!hasPermissions) {
      Alert.alert(
        "Permission Denied",
        "We need camera and mic access to stream.",
      );
      return;
    }

    try {
      const { data } = await createStream({
        variables: { title: `${username}'s Live`, neighborhoodId },
      });
      sessionIdRef.current = data.createStream.sessionId;

      setIsStreaming(true);
      // Tell the WebView to start recording
      webViewRef.current?.injectJavaScript(`
      window.postMessage(JSON.stringify({ action: "start" }), "*");
  true;
      `);
    } catch (error) {
      console.error("Failed to start stream:", error);
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

      if (data.type === "STARTED") {
        console.log("🎥 WebView Camera Started");
      } else if (data.type === "ERROR") {
        Alert.alert("Camera Error", data.message);
      } else if (data.type === "CHUNK") {
        // Upload the chunk to the backend
        const token = await AsyncStorage.getItem("token");

        const res = await fetch(`${BACKEND_URL}/api/live-chunk-native`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            chunkIndex: data.index,
            base64: data.base64,
            rotation: 0,
            mimeType: data.mimeType,
          }),
        });

        if (res.ok) {
          const result = await res.json();

          console.log(`✅ Uploaded chunk ${data.index}`);

          // Tell the database
          // (Assuming you have a SEND_CHUNK mutation here to save the message)

          // 🚨 NOW tell GraphQL so the subscription fires!
          await sendChunk({
            variables: {
              content: data.index === -1 ? "STREAM_HEADER" : "",
              neighborhoodId,
              magnetLink: result.magnetUri,
              fileType: data.index === -1 ? "video_header" : "video_chunk",
              sessionId: sessionIdRef.current,
              chunkIndex: data.index,
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
        androidLayerType="hardware"
        setBuiltInZoomControls={false}
        javaScriptCanOpenWindowsAutomatically={true}
        onPermissionRequest={handlePermissionRequest}
        onMessage={onMessage}
        style={{ flex: 1 }}
        mediaCapturePermissionGrantType="grant"
      />

      <View style={styles.overlay}>
        {!isStreaming ? (
          <TouchableOpacity style={styles.button} onPress={startStream}>
            <Text style={styles.buttonText}>🔴 START NATIVE STREAM</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#444" }]}
            onPress={stopStream}
          >
            <Text style={styles.buttonText}>⏹️ STOP</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { position: "absolute", bottom: 40, left: 20, right: 20 },
  button: {
    backgroundColor: "#ff375f",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
