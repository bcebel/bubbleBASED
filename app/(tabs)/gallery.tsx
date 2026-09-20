// app/(tabs)/gallery.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  useWindowDimensions,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Head from "expo-router/head";
import WebTorrentMedia from "@/components/TorrentOnlyMedia";
import { themes } from "../theme";
import { warehouse } from "../../components/StreamWearhouse";
import { mediaCache } from "../../components/mediaCache";

import { useRouter } from "expo-router";
import AllNeighborhoodsGallery from '../../components/AllNeighborhoodsGallery';

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

export default function GalleryScreen() {
  const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
 

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem('token');
      setIsLoggedIn(!!token);
      setLoading(false);
    };
    checkLogin();
  }, []);

  // 🚨 SAFE EARLY RETURN: If loading, show spinner
  if (loading) return <ActivityIndicator size="large" color="#00ffff" style={styles.loading} />;

  // 🚨 LOGGED OUT: Show the exact same style as Livestream
  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>bubbleBASED - Gallery</title>
          <meta
            name="description"
            content="Beautiful gallery of all media posted throughout your bubbles.  Social media is supposed to be enjoyable after all, post events and memories that YOU love, join bubbles you would want to be in.  No clickbait and comment sniping."
          />
        </Head>
        <View style={styles.container}>
          <ImageBackground
            source={require("@/assets/images/bbl.jpg")}
            style={styles.heroBubble}
            resizeMode="cover"
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
                <Text style={styles.logoBadgeText}>bB</Text>
              </View>
              <Text style={styles.brandTitle}>bubbleBASED</Text>
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
                  onPress={() => router.push("/login")}
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
              style={[
                styles.heroSection,
                isDesktop && styles.heroSectionDesktop,
              ]}
            >
              <View
                style={[
                  styles.heroTextContainer,
                  isDesktop && styles.heroTextDesktop,
                ]}
              >
                <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>Peer-to-peer playback</Text>
                </View>

                <Text style={styles.heroTitle} role="heading" aria-level={1}>
                  Powered by Viewers, Not Servers
                </Text>

                <Text style={styles.heroSub}>
                  Instead of every video loading from a massive data center,
                  users help host the content they're watching. When you view a
                  video, your device securely passes small pieces of it to other
                  people watching at the same time.
                </Text>

                {/* ACTION BUTTONS (Login / Logout / Join) */}
                <View style={styles.actionsRow}>
                  <BlurView
                    intensity={50}
                    tint="dark"
                    style={styles.bubbleGlass}
                  >
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => router.push("/register")}
                    >
                      <Text style={styles.actionButtonText}>
                        Join bubbleBASED
                      </Text>
                    </TouchableOpacity>
                  </BlurView>

                  <BlurView
                    intensity={50}
                    tint="dark"
                    style={styles.bubbleGlass}
                  >
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => router.push("/login")}
                    >
                      <Text style={styles.actionButtonText}>Sign In</Text>
                    </TouchableOpacity>
                  </BlurView>

                  <BlurView
                    intensity={50}
                    tint="dark"
                    style={styles.bubbleGlass}
                  ></BlurView>
                </View>
              </View>

              {/* CODE / PEER STATUS CARD */}
              <View
                style={[
                  styles.heroVisualCard,
                  isDesktop && styles.heroVisualDesktop,
                ]}
              >
                <BlurView
                  intensity={30}
                  tint="dark"
                  style={styles.demoGlassCard}
                >
                  {/* 1. WebTorrent Live Media Player */}
                  <View style={styles.mediaFrame}>
                    <WebTorrentMedia
                      media={{
                        cid: "QmZd15VPt9KXtn9svRk77LrheBtu9Gkhdv9ALphug9C3L3",
                        magnetLink:
                          "magnet:?xt=urn:btih:b4496f8e52e074b5a233814b0cd83785211a1393&dn=video-QmZd15VPt9KXtn9svRk77LrheBtu9Gkhdv9ALphug9C3L3&tr=wss%3A%2F%2Ftracker-0ad4cca9fd92.herokuapp.com&tr=wss%3A%2F%2Ftracker.files.fm%3A7073%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.files.fm%3A7073&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker3.itzmx.com%3A6961%2Fannounce&ws=https%3A%2F%2Ffuchsia-solid-parrot-571.mypinata.cloud%2Fipfs%2FQmZd15VPt9KXtn9svRk77LrheBtu9Gkhdv9ALphug9C3L3",
                        fileName: "post_1789941383843.mp4w",
                        fileType: "video",
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
                      <Text style={styles.mockCodeText}>// bubbleBASED</Text>
                      <Text style={styles.mockCodeTextAccent}>
                        video: "shared"{" "}
                      </Text>
                      <Text style={styles.mockCodeText}>
                        literally: "shared"{" "}
                      </Text>
                      <Text style={styles.mockCodeText}>
                        network: "us"{" "}
                      </Text>
                      <Text style={styles.mockCodeText}>bubble: "based" </Text>
                    </View>
                  </View>
                </BlurView>
              </View>
            </View>

            {/* MARGARET MEAD QUOTE */}
            <View style={styles.quoteSection}>
              <BlurView
                intensity={40}
                tint="dark"
                style={styles.quoteGlassCard}
              >
                <Text style={styles.quoteText}>
                  "The best thing about a picture is that it never changes,
                  even when the people in it do."
                </Text>
                <Text style={styles.quoteAuthor}>— Andy Warhol</Text>
              </BlurView>
            </View>

            {/* FOOTER */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>
                © {new Date().getFullYear()} bubbleBASED. Built with React
                Native & Expo Router.
              </Text>
            </View>
          </ScrollView>
        </View>
      </>
    );
  }

  // ✅ LOGGED IN: Render the actual gallery ONLY HERE
  // (If this crashes, it's the backend resolver, not the login check)
  return (
    <View style={{ flex: 1 }}>
      <AllNeighborhoodsGallery />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    marginTop: 50,
  },
  heroBubble: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.90,
  },
  loginButton: {
    backgroundColor: "#00FFFF",
    padding: 15,
    borderRadius: 30,
    width: "80%",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 85,
  },
  loginButtonText: {
    color: "#130720",
    fontWeight: "bold",
    fontSize: 18,
  },

    container: {
      flex: 1,
      backgroundColor: "#0A0C10",
    },
    heroBubble: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.55,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
  
    // Nav Header
    navContainer: {
      paddingHorizontal: 24,
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
      paddingHorizontal: 48,
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
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: "#FF0081",
      alignItems: "center",
      justifyContent: "center",
    },
    logoBadgeText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 18,
    },
    brandTitle: {
      color: "#F5F2FA",
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
      color: "#10B981",
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