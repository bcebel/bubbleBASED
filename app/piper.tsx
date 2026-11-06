import { Platform, View } from "react-native";
import { useEffect } from "react";  
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";
import { Camera } from "expo-camera";

export default function WebRTCCallScreen() {
  const { room } = useLocalSearchParams<{ room?: string }>();

  // If no room in the URL, make one up so a stray tab doesn't join a public swarm
  const roomId = room || `room-${Math.random().toString(36).slice(2, 9)}`;

  const url =
   `https://ebubbl.com/pipe.html?room=${encodeURIComponent(roomId)}`;

  if (Platform.OS === "web") {
    return (
      <iframe
        src={url}
        style={{ flex: 1, width: "100%", height: "100%", border: "none" }}
        allow="camera; microphone; fullscreen"
        title="WebRTC Call"
      />
    );
  }

  useEffect(() => {
  (async () => {
    await Camera.requestCameraPermissionsAsync();
    await Audio.requestMicrophonePermissionsAsync();
  })();
  }, []);
  
  return (
    <WebView
      source={{ uri: url }}
      style={{ flex: 1 }}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      originWhitelist={["*"]}
        mediaCapturePermissionGrantType="grant"
      onPermissionRequest={(event) => {
        event.request.grant(event.request.getAccessibleResource());
      }}
    />
  );
}
