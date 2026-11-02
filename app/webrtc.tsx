import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";

export default function WebRTCCallScreen() {
  const url = "https://ebubbl.com/webrtctest.html?room=abc123";

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
