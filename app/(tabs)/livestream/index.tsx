import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";

import { gql, useQuery, useSubscription } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Head from "expo-router/head";
import WebTorrentMedia from "@/components/TorrentOnlyMedia";

import NeighborhoodLiveStreamPlayer from "../../../components/NeighborhoodLiveStreamPlayer";
import { warehouse } from "../../../components/StreamWearhouse.js";
import { useRouter } from "expo-router";

const API_BASE = "https://minnowspacebackend-e6635e46c3d0.herokuapp.com";

const GET_ACTIVE_LIVESTREAMS = gql`
  query GetActiveLivestreams {
    streams(status: "live") {
      id
      title
      sessionId
      status
      createdAt
    }
  }
`;

const LIVESTREAM_CHUNK_SUBSCRIPTION = gql`
  subscription OnLivestreamChunkAdded($sessionId: String!) {
    livestreamChunkAdded(sessionId: $sessionId) {
      id
      sessionId
      chunkIndex
      magnetLink
      fileName
      fileType
      fileSize
      thumbnailUrl
      rotation
    }
  }
`;

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

// --- INDIVIDUAL STREAM PLAYER ITEM ---
function StreamItem({ stream }: { stream: any }) {
  const [availableInWarehouse, setAvailableInWarehouse] = useState<number[]>(
    [],
  );
  const sessionId = stream?.sessionId;

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isiPhone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const shouldRotate = isSafari || isiPhone;
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let isMounted = true;

    const fetchRotation = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/stream-rotation/${sessionId}`);
        const data = await res.json();
        if (isMounted) setRotation(data.rotation || 0);
      } catch (e) {}
    };

    fetchRotation();
    const interval = setInterval(fetchRotation, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let interval: NodeJS.Timeout;

    const findInitialData = async () => {
      const chunksToGet = [-1, 0];
      let foundCount = 0;

      for (const idx of chunksToGet) {
        if (availableInWarehouse.includes(idx)) {
          foundCount++;
          continue;
        }
        try {
          const res = await fetch(
            `${API_BASE}/api/live-chunk/${sessionId}/${idx}`,
          );
          if (res.ok) {
            const bytes = await res.arrayBuffer();
            await warehouse.saveChunk(sessionId, idx, new Uint8Array(bytes));
            setAvailableInWarehouse((prev) => [...new Set([...prev, idx])]);
            foundCount++;
          }
        } catch (e) {}
      }

      if (foundCount === 2) clearInterval(interval);
    };

    interval = setInterval(findInitialData, 3000);
    findInitialData();

    return () => clearInterval(interval);
  }, [sessionId]);

  useSubscription(LIVESTREAM_CHUNK_SUBSCRIPTION, {
    variables: { sessionId },
    skip: !sessionId,
    onData: async ({ data }) => {
      const chunk = data.data?.livestreamChunkAdded;
      if (!chunk) return;
      if (chunk.rotation) setRotation(chunk.rotation);

      try {
        const res = await fetch(
          `${API_BASE}/api/live-chunk/${sessionId}/${chunk.chunkIndex}`,
        );
        if (res.ok) {
          const bytes = await res.arrayBuffer();
          await warehouse.saveChunk(
            sessionId,
            chunk.chunkIndex,
            new Uint8Array(bytes),
          );
          setAvailableInWarehouse((prev) => [
            ...new Set([...prev, chunk.chunkIndex]),
          ]);
        }
      } catch (e) {}
    },
  });

  if (!sessionId) return null;

  return (
    <View style={styles.streamContainer}>
      <View style={styles.infoOverlay}>
        <Text style={styles.streamTitle}>{stream.title}</Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <NeighborhoodLiveStreamPlayer
        sessionId={sessionId}
        availableInWarehouse={availableInWarehouse}
        rotation={shouldRotate ? rotation : 0}
      />
    </View>
  );
}

// --- TAB SCREEN ROUTE ---
export default function StreamsScreen() {
  const router = useRouter();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem("token");
      setIsLoggedIn(!!token);
      setAuthChecked(true);
    };
    checkLogin();
  }, []);

  const { data: streamsData, loading } = useQuery(GET_ACTIVE_LIVESTREAMS, {
    pollInterval: 5000,
    skip: !isLoggedIn,
  });

  // 1. auth not resolved yet
  if (!authChecked) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // 2. logged out → marketing page
  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>bubbleBASED - Livestream</title>
          <meta
            name="description"
            content="Live streams from your bubbles. Peer-to-peer video, no middlemen, no replay tracking. Watch what your people are sharing right now."
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
                  <Text style={styles.tagBadgeText}>
                    A Neighborhood on the Internet
                  </Text>
                </View>

                <Text style={styles.heroTitle} role="heading" aria-level={1}>
                  Live Streaming
                </Text>

                <Text style={styles.heroSub}>
                  Stream to your neighborhood or stream to the planet. Streams
                  stick around for a short while after you are done so people
                  can catch up if they missed you.
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
                      onPress={() => router.replace("/register")}
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
                      onPress={() => router.replace("/login")}
                    >
                      <Text style={styles.actionButtonText}>
                        Log in to watch.
                      </Text>
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
                <BlurView
                  intensity={30}
                  tint="dark"
                  style={styles.demoGlassCard}
                >
                  {/* 1. WebTorrent Live Media Player */}
                  <View style={styles.mediaFrame}>
                    <WebTorrentMedia
                      media={{
                        cid: "QmXmL9WVwYV7dejPvHaTQskxZvHYHNtqnrFCrw4iaQsobr",
                        magnetLink:
                          "magnet:?xt=urn:btih:228c0348c75adead643e8a9bc81a080747df2027&dn=video-QmXmL9WVwYV7dejPvHaTQskxZvHYHNtqnrFCrw4iaQsobr&tr=wss%3A%2F%2Ftracker-0ad4cca9fd92.herokuapp.com&tr=wss%3A%2F%2Ftracker.files.fm%3A7073%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.files.fm%3A7073&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker3.itzmx.com%3A6961%2Fannounce&ws=https%3A%2F%2Ffuchsia-solid-parrot-571.mypinata.cloud%2Fipfs%2FQmXmL9WVwYV7dejPvHaTQskxZvHYHNtqnrFCrw4iaQsobr",
                        fileName: "post_1789944497872.mp4",
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
                        live: "stream"{" "}
                      </Text>
                      <Text style={styles.mockCodeText}>peers: "boost" </Text>
                      <Text style={styles.mockCodeText}>
                        replay: "temporary"{" "}
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
                  The colors of the rainbow, So pretty in the sky - Are also on
                  the faces Of people going by. I see friends shaking hands,
                  Saying, "How do you do?" They're really saying I love you.
                </Text>
                <Text style={styles.quoteAuthor}>— Louis Armstrong</Text>
              </BlurView>
            </View>

            {/* FOOTER */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>
                © {new Date().getFullYear()} bubbleBASED. Click tabs for more
                info.
              </Text>
            </View>
          </ScrollView>
        </View>
      </>
    );
  }

  // 3. logged in → actual app
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <FlatList
        data={streamsData?.streams || []}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <View style={{ height: SCREEN_HEIGHT, width: "100%" }}>
            <StreamItem stream={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.noStreamsText}>No active streams nearby</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.goLiveButton}
        onPress={() => router.replace("/livestream/selector")}
      >
        <Text style={styles.goLiveButtonText}>+ Go Live</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0C10",
  },
  mainWrapper: { flex: 1, backgroundColor: "#130720" },
  centerContainer: {
    flex: 1,
    backgroundColor: "#130720",
    justifyContent: "center",
    alignItems: "center",
  },
  streamContainer: { width: "100%", height: "100%" },
  infoOverlay: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  streamTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 10,
  },
  liveBadge: {
    backgroundColor: "#ff375f",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: { color: "white", fontSize: 12, fontWeight: "bold" },
  noStreamsText: { color: "white", fontSize: 18 },
  goLiveButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#ff375f",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    zIndex: 20,
  },
  goLiveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  // marketing-only styles
  marketingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  marketingText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  heroBubble: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.75,
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
