import { Link, Stack } from "expo-router";
import { StyleSheet, View, Text, Platform, Pressable } from "react-native";
import { BlurView } from "expo-blur";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "404 — Lost in the Bubble" }} />
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title} role="heading" aria-level={1}>
            You're not in this bubble 🫧.
          </Text>

          <Text style={styles.subtitle}>
            This page doesn't exist, or it's private, or it never existed. Hard
            to say. The bubble doesn't remember 🫧
          </Text>

          {/* CIRCULAR LOGIC TERMINAL BOX */}
          <BlurView intensity={30} tint="dark" style={styles.terminalBox}>
            <View style={styles.terminalHeader}>
              <View style={[styles.dot, { backgroundColor: "#FF5F56" }]} />
              <View style={[styles.dot, { backgroundColor: "#FFBD2E" }]} />
              <View style={[styles.dot, { backgroundColor: "#27C93F" }]} />
            </View>
            <View style={styles.terminalContent}>
              <Text style={styles.codeText}>// bubbleBASED</Text>
              <Text style={styles.codeAccent}>circular: "logic" </Text>
              <Text style={styles.codeText}>logic: "circular" </Text>
              <Text style={styles.codeText}>404: "still loading" </Text>
              <Text style={styles.codeText}>bubble: "based" </Text>
            </View>
          </BlurView>

          {/* YOGI BERRA — the accidental circular logic king */}
          <BlurView intensity={40} tint="dark" style={styles.quoteBox}>
            <Text style={styles.quoteText}>
              "You can observe a lot by just watching."
            </Text>
            <Text style={styles.quoteAuthor}>🫧 Yogi Berra</Text>
          </BlurView>

          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>← Go home</Text>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#130720",
  },
  content: {
    maxWidth: 500,
    width: "100%",
    alignItems: "center",
  },
  title: {
    color: "#F5F2FA",
    fontSize: Platform.OS === "web" ? 36 : 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 32,
  },
  terminalBox: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(13, 16, 23, 0.9)",
    padding: 16,
    marginBottom: 24,
  },
  terminalHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  terminalContent: {
    gap: 8,
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#6B7280",
    fontSize: 14,
  },
  codeAccent: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#10B981",
    fontSize: 14,
    fontWeight: "600",
  },
  quoteBox: {
    width: "100%",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 0, 129, 0.1)",
    marginBottom: 24,
  },
  quoteText: {
    color: "#F5F2FA",
    fontSize: 17,
    lineHeight: 26,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 12,
  },
  quoteAuthor: {
    color: "#FF5CB0",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  link: {
    marginTop: 8,
    paddingVertical: 15,
  },
  linkText: {
    color: "#00ffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
