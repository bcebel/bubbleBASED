import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ImageBackground,
  useWindowDimensions,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import Head from "expo-router/head";
import WebTorrentMedia from "@/components/WebTorrentMedia";
import { themes } from "../theme";
import { warehouse } from "../../components/StreamWearhouse";
import { mediaCache } from "../../components/mediaCache";
import { clearApolloStore } from "@/context/apolloProvider";

export default function HomeScreen() {
  const [peerCount, setPeerCount] = useState(null);
  const [source, setSource] = useState(null);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const theme = themes.bubblefusion.dark;

 const handleLogout = async () => {
  try {
    // fire and forget — don't await
    clearApolloStore().catch(() => {});

    // clear all auth AND persist keys
    await AsyncStorage.multiRemove([
      "token",
      "username",
      "userId",
      "apollo-cache-persist",
    ]);

    await warehouse.clearAllExcept("");

    router.replace("/login");
  } catch (error) {
    console.error("Logout error:", error);
  }
};

  return (
    <>
      <Head>
        <title>ebubbl</title>
        <meta
          name="description"
          content="🫧  Private & public bubbles 🫧 where your content lives in context. No algorithms. Community ads. Just your people."
        />
      </Head>
      <View style={styles.container}>
        <ImageBackground
          source={require("@/assets/images/bbl.webp")}
          style={styles.heroBubble}
          resizeMode="cover"
          fetchPriority="high"
        />

        {/* NAV HEADER */}
        <View
          style={[
            styles.navContainer,
            isDesktop ? styles.navDesktop : styles.navMobile,
          ]}
        >
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>e🫧</Text>
            </View>
            <Text style={styles.brandTitle}>ebubbl</Text>
          </View>

          <View style={styles.navLinks}>
            <NavButton title="" />
            <NavButton title="" />
            <NavButton title="" />

            <BlurView
              intensity={50}
              tint="dark"
              style={styles.bubbleGlassCompact}
            >
              <TouchableOpacity
                style={styles.navActionButton}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.navActionButtonText}>Sign In</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO SECTION */}
          <View
            style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}
          >
            <View
              style={[
                styles.heroTextContainer,
                isDesktop && styles.heroTextDesktop,
              ]}
            >
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>
                  From the Global Village
                </Text>
              </View>

              <Text style={styles.heroTitle} role="heading" aria-level={1}>
                welcome to ebubbl 🫧
              </Text>

              <Text style={styles.heroSub}>
                No algorithm deciding what you see. No strangers in your feed.
                Just the bubbles you choose to be in, full of the people you
                chose to meet.
              </Text>

              {/* ACTION BUTTONS (Login / Logout / Join) */}
              <View style={styles.actionsRow}>
                <BlurView intensity={50} tint="dark" style={styles.bubbleGlass}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.replace("/register")}
                  >
                    <Text style={styles.actionButtonText}>
                      Join ebubbl
                    </Text>
                  </TouchableOpacity>
                </BlurView>

                <BlurView intensity={50} tint="dark" style={styles.bubbleGlass}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.replace("/login")}
                  >
                    <Text style={styles.actionButtonText}>Sign In</Text>
                  </TouchableOpacity>
                </BlurView>

                <BlurView intensity={50} tint="dark" style={styles.bubbleGlass}>
                  <TouchableOpacity
                    onPress={handleLogout}
                    style={styles.logoutButton}
                  >
                    <Text style={styles.actionButtonText}>Logout</Text>
                  </TouchableOpacity>
                </BlurView>
              </View>
            </View>

            {/* CODE / PEER STATUS CARD */}
            <View
              style={[
                styles.heroVisualCard,
                isDesktop && styles.heroVisualDesktop,
              ]}
            >
              <BlurView intensity={30} tint="dark" style={styles.demoGlassCard}>
                {/* 1. WebTorrent Live Media Player */}
        <View style={styles.mediaFrame}>
  <WebTorrentMedia
    media={{
      cid: "QmNPmuK8zEW6bM6hsDQSK82dQorXyft5wDKDLSoHo7LXLj",
      magnetLink: "magnet:?xt=urn:btih:a98117648438fd9089ccaba4a1285f16ff5189db&dn=image-QmNPmuK8zEW6bM6hsDQSK82dQorXyft5wDKDLSoHo7LXLj&tr=wss%3A%2F%2Ftracker-0ad4cca9fd92.herokuapp.com&tr=wss%3A%2F%2Ftracker.files.fm%3A7073%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.files.fm%3A7073&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker3.itzmx.com%3A6961%2Fannounce&ws=https%3A%2F%2Febubbl.com%2Fapi%2Fwebseed%2FQmNPmuK8zEW6bM6hsDQSK82dQorXyft5wDKDLSoHo7LXLj",
      fileName: "post_1790983248629.jpg",
      fileType: "image",
    }}
    isFocused={true}
  />
  <View style={styles.peerBadge}>
    <View style={styles.liveDot} />
    <Text style={styles.peerBadgeText}></Text>
  </View>
</View>

                {/* 2. Mock Terminal Status Box */}
                <View style={styles.mockTerminalBox}>
                  <View style={styles.terminalHeader}>
                    <View
                      style={[styles.dot, { backgroundColor: "#FF5F56" }]}
                    />
                    <View
                      style={[styles.dot, { backgroundColor: "#FFBD2E" }]}
                    />
                    <View
                      style={[styles.dot, { backgroundColor: "#27C93F" }]}
                    />
                    <Text style={styles.terminalTitle}></Text>
                  </View>
                  <View style={styles.mockContentBox}>
                    <Text style={styles.mockCodeText}>// ebubbl</Text>
                    <Text style={styles.mockCodeTextAccent}>
                      vibe: "chill"
                    </Text>
                    <Text style={styles.mockCodeText}>people: "cool" </Text>
                    <Text style={styles.mockCodeText}>algorithm: "none" </Text>
                    <Text style={styles.mockCodeText}>bubble: "based" </Text>
                  </View>
                </View>
              </BlurView>
            </View>
          </View>

          {/* MARGARET MEAD QUOTE */}
          <View style={styles.quoteSection}>
            <BlurView intensity={40} tint="dark" style={styles.quoteGlassCard}>
              <Text style={styles.quoteText}>
                based (adj.) Unconcerned with what others think. Being yourself,
                not scared of what people think about you. Opposite of cringe.
              </Text>
              <Text style={styles.quoteAuthor}>— Mirriam Webster</Text>
            </BlurView>
          </View>

          {/* FOOTER */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} ebubbl. Click tabs for more
              info.
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function NavButton({ title }: { title: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={styles.navLinkPressable}
    >
      <Text style={[styles.navLinkText, hovered && styles.navLinkTextHover]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0C10",
  },
  heroBubble: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Nav Header
  navContainer: {
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(10, 12, 16, 0.75)",
    zIndex: 10,
  },
  navDesktop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  navMobile: {
    flexDirection: "column",
    gap: 16,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: 20,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeText: {
    color: "#FFCC00",
    fontWeight: "800",
    fontSize: 18,
  },
  brandTitle: {
    color: "#F7D948",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  navLinkPressable: {
    paddingVertical: 4,
  },
  navLinkText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "500",
  },
  navLinkTextHover: {
    color: "#FFFFFF",
  },
  navActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    flexDirection: "column",
    gap: 32, // Guarantees space between text/buttons and the visual card
  },
  heroSectionDesktop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 48,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTextDesktop: {
    paddingRight: 40,
  },
  tagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 0, 129, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 0, 129, 0.4)",
  },
  tagBadgeText: {
    color: "#FF5CB0",
    fontSize: 13,
    fontWeight: "600",
  },
  heroTitle: {
    color: "#F5F2FA",
    fontSize: Platform.OS === "web" ? 44 : 34,
    fontWeight: "800",
    lineHeight: Platform.OS === "web" ? 52 : 42,
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroSub: {
    color: "#9CA3AF",
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 32,
  },

  // Actions Container (Buttons)
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap", // Prevents buttons from spilling into the card below
    marginBottom: 24, // Adds explicit margin beneath the buttons
  },
  bubbleGlass: {
    borderRadius: 48,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 129, 0.3)",
    backgroundColor: "rgba(255, 0, 129, 0.2)",
  },
  bubbleGlassCompact: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 129, 0.3)",
    backgroundColor: "rgba(255, 0, 129, 0.2)",
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 48,
    alignItems: "center",
    backgroundColor: "rgba(21, 17, 89, 0.6)",
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 48,
    alignItems: "center",
    backgroundColor: "rgba(57, 17, 89, 0.6)",
  },
  logoutButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 48,
    alignItems: "center",
    backgroundColor: "rgba(89, 17, 85, 0.6)",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Visual Card
  heroVisualCard: {
    width: "100%",
    backgroundColor: "rgba(19, 23, 31, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    minHeight: 200, // Reduced from 280 for mobile screens
  },
  heroVisualDesktop: {
    flex: 1, // Only flex on desktop layout
    maxWidth: 480,
  },
  visualCardInner: {
    flex: 1,
    backgroundColor: "#0D1017",
    borderRadius: 10,
    padding: 16,
  },
  visualCardHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mockContentBox: {
    gap: 12,
  },
  mockCodeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#6B7280",
    fontSize: 14,
  },
  mockCodeTextAccent: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#F55C9C",
    fontSize: 14,
    fontWeight: "600",
  },

  // Quote Section
  quoteSection: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
  },
  quoteGlassCard: {
    maxWidth: 700,
    width: "100%",
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 0, 129, 0.1)",
  },
  quoteText: {
    color: "#F5F2FA",
    fontSize: 20,
    lineHeight: 30,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 16,
  },
  quoteAuthor: {
    color: "#FF5CB0",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },

  // Footer
  footerContainer: {
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  footerText: {
    color: "#6B7280",
    fontSize: 14,
  },
});
