import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";

export default function WebRTCCallScreen() {
  const { room } = useLocalSearchParams<{ room?: string }>();

  // If no room in the URL, make one up so a stray tab doesn't join a public swarm
  const roomId = room || `room-${Math.random().toString(36).slice(2, 9)}`;

  const url =
   `http://localhost:8081/groupcall.html?room=${encodeURIComponent(roomId)}`;

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

  return (
    <WebView
      source={{ uri: url }}
      style={{ flex: 1 }}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      originWhitelist={["*"]}
    />
  );
}
