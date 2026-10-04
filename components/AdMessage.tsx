// components/AdMessage.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import { Image } from "expo-image";

export default function AdMessage({ ad, style }) {
  const handlePress = async () => {
    try {
      if (!ad.url) return;
      if (Platform.OS === "web") {
        const w = window.open(ad.url, "_blank", "noopener,noreferrer");
        if (w) w.opener = null;
      } else {
        await Linking.openURL(ad.url);
      }
    } catch (err) {
      console.error("Failed to open link:", err);
    }
  };

  const domain = (() => {
    try {
      return new URL(ad.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>SPONSOR</Text>
      </View>

      {ad.imageUrl ? (
        <Image
          source={{ uri: ad.imageUrl }}
          style={styles.image}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>📢</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {ad.title || "Sponsored Link"}
        </Text>
        {domain ? (
          <Text style={styles.domain} numberOfLines={1}>
            {domain}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.visitButton}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <Text style={styles.cta}>Visit →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(89, 17, 85, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.2)",
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    height: "100%",
    alignSelf: "stretch",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 5,
  },
  badgeText: {
    color: "#00ffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  image: {
    width: "100%",
    height: "55%", // ← was 65%
    backgroundColor: "#130720",
  },
  imagePlaceholder: {
    width: "100%",
    height: "55%", // ← was 65%
    backgroundColor: "#130720",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 64,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
    minHeight: 120, // ← ensures the footer has room
  },
  title: {
    color: "#F5F2FA",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  domain: {
    color: "#9CA3AF",
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
  },
  visitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(0, 255, 255, 0.15)",
    borderWidth: 1.5,
    borderColor: "#00ffff",
    borderRadius: 24,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    color: "#00ffff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
