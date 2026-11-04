import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
  FlatList,
} from "react-native";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, Link } from "expo-router";
import Head from "expo-router/head";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, gql } from "@apollo/client";

import WebTorrentMedia from "@/components/WebTorrentMediaPosts";
import { clearApolloStore } from "@/context/apolloProvider";
import { warehouse } from "../../components/StreamWearhouse";
import { MY_PERSONAL_BUBBLES } from "../../components/graphql/queries";

const PINATA_GATEWAY = process.env.EXPO_PUBLIC_PINATA_GATEWAY;

const GET_INBOX_AND_ME = gql`
  query GetInboxAndMe {
    myDirectMessageBubbles {
      id
      name
      members {
        user {
          username
        }
      }
    }
    me {
      username
    }
  }
`;

export default function ConsolidatedHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isWide = width >= 900;

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check Auth Status on Mount
  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem("token");
      setIsLoggedIn(!!token);
      setAuthChecked(true);
    };
    checkLogin();
  }, []);

  // GraphQL Queries (skipped if user is logged out)
  const {
    data: personalData,
    loading: loadingPersonal,
    error: errorPersonal,
  } = useQuery(MY_PERSONAL_BUBBLES, {
    skip: !isLoggedIn,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "network-only",
  });

  const {
    data: inboxData,
    loading: loadingInbox,
    error: errorInbox,
  } = useQuery(GET_INBOX_AND_ME, {
    skip: !isLoggedIn,
    fetchPolicy: "network-only",
  });

  // Handle Logout Logic
  const handleLogout = async () => {
    try {
      clearApolloStore().catch(() => {});
      await AsyncStorage.multiRemove([
        "token",
        "username",
        "userId",
        "apollo-cache-persist",
      ]);
      await warehouse.clearAllExcept("");
      setIsLoggedIn(false);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!authChecked) {
    return <ActivityIndicator size="large" color="#00ffff" style={styles.loading} />;
  }

  // ==========================================
  // 1. LOGGED OUT STATE (Hero Landing Page)
  // ==========================================
  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>ebubbl | Private Bubbles & Global Villages</title>
          <meta
            name="description"
            content="From the global village to private bubbles 🫧, connect with fun people in the correct context."
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
          <View style={[styles.navContainer, isDesktop ? styles.navDesktop : styles.navMobile]}>
            <View style={styles.brandContainer}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>e🫧</Text>
              </View>
              <Text style={styles.brandTitle}>ebubbl</Text>
            </View>

            <View style={styles.navLinks}>
              <BlurView intensity={50} tint="dark" style={styles.bubbleGlassCompact}>
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
            <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>
              <View style={[styles.heroTextContainer, isDesktop && styles.heroTextDesktop]}>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>Life is better with bubbles!</Text>
                </View>

                <Text style={styles.heroTitle} role="heading" aria-level={2}>
                  welcome to ebubbl
                </Text>

                <Text style={styles.heroSub}>
                  Make and join groups of like-minded individuals. Post, Chat & Livestream with your peers. Post to the world or just to your besties.
                </Text>

                <View style={styles.actionsRow}>
                  <BlurView intensity={50} tint="dark" style={styles.bubbleGlass}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => router.replace("/register")}
                    >
                      <Text style={styles.actionButtonText}>Join ebubbl</Text>
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
                      onPress={() => router.replace("/bubbles/global")}
                      style={styles.thirdButton}
                    >
                      <Text style={styles.actionButtonText}>Check Out Global Bubbles</Text>
                    </TouchableOpacity>
                  </BlurView>
                </View>
              </View>

              {/* MEDIA CARD */}
              <View style={[styles.heroVisualCard, isDesktop && styles.heroVisualDesktop]}>
                <BlurView intensity={30} tint="dark" style={styles.demoGlassCard}>
                  <View style={styles.mediaFrame}>
                    <WebTorrentMedia
                      media={{
                        cid: "QmNPmuK8zEW6bM6hsDQSK82dQorXyft5wDKDLSoHo7LXLj",
                        magnetLink:
                          "magnet:?xt=urn:btih:a98117648438fd9089ccaba4a1285f16ff5189db&dn=image-QmNPmuK8zEW6bM6hsDQSK82dQorXyft5wDKDLSoHo7LXLj",
                        fileName: "post_1790983248629.jpg",
                        fileType: "image",
                      }}
                      isFocused={true}
                    />
                  </View>
                </BlurView>
              </View>
            </View>

            <View style={styles.quoteSection}>
              <BlurView intensity={40} tint="dark" style={styles.quoteGlassCard}>
                <Text style={styles.quoteText}>Good bubbles make great neighbors</Text>
              </BlurView>
            </View>
          </ScrollView>
        </View>
      </>
    );
  }

  // ==========================================
  // 2. LOGGED IN STATE (Consolidated Dashboard)
  // ==========================================
  const neighborhoods = personalData?.myPersonalBubbles || [];
  const inboxBubbles = inboxData?.myDirectMessageBubbles || [];
  const myUsername = inboxData?.me?.username;

  return (
    <View style={styles.container}>
      {/* APP TOP BAR WITH LOGOUT */}
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>ebubbl Hub 🫧</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.headerLogoutBtn}>
          <Text style={styles.headerLogoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.dashboardScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* INBOX SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>📩 Inbox</Text>

          {loadingInbox ? (
            <ActivityIndicator size="small" color="#00ffff" />
          ) : inboxBubbles.length === 0 ? (
            <Text style={styles.emptyText}>No direct messages yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalDmList}>
              {inboxBubbles.map((item: any) => {
                const otherUsers = item.members.filter(
                  (m: any) => m.user.username !== myUsername
                );
                const displayName =
                  otherUsers.map((m: any) => m.user.username).join(" ↔ ") || "Direct Message";

                return (
                  <View key={item.id} style={styles.inboxCard}>
                    <Text style={styles.inboxCardName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => router.replace(`/neighborhood-chat?neighborhoodId=${item.id}`)}
                    >
                      <Text style={styles.chatButtonText}>Open Chat</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* PERSONAL BUBBLES SECTION */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>🏘️ My Personal Bubbles</Text>

          {loadingPersonal ? (
            <ActivityIndicator size="large" color="#00ffff" style={{ marginTop: 20 }} />
          ) : errorPersonal ? (
            <Text style={styles.errorText}>Error: {errorPersonal.message}</Text>
          ) : neighborhoods.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>You haven't joined any bubbles yet.</Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => router.replace(`/bubbles/all`)}
              >
                <Text style={styles.browseButtonText}>Browse Bubbles to Join</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.grid}>
              {neighborhoods.map((item: any) => (
                <View key={item.id} style={[styles.gridItem, isWide && styles.gridItemWide]}>
                  <Link href={`/setup/personal/${item.id}`} asChild>
                    <TouchableOpacity style={styles.neighborhoodItem}>
                      <ImageBackground
                        source={
                          item.bubblePhotoCid
                            ? { uri: `https://${PINATA_GATEWAY}/ipfs/${item.bubblePhotoCid}` }
                            : require("@/assets/images/bbl.webp")
                        }
                        style={styles.neighborhoodCardImage}
                        resizeMode="cover"
                      >
                        <LinearGradient
                          colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.2)"]}
                          style={styles.neighborhoodCardOverlay}
                        >
                          <Text style={styles.neighborhoodName}>{item.name}</Text>
                          <Text style={styles.neighborhoodType}>
                            {item.type} • {item.members?.length || 0} members
                          </Text>
                          <Text style={styles.neighborhoodDescription} numberOfLines={2}>
                            About: {item.description}
                          </Text>
                        </LinearGradient>
                      </ImageBackground>
                    </TouchableOpacity>
                  </Link>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0C10",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  dashboardScrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(10, 12, 16, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#00ffff",
  },
  headerLogoutBtn: {
    backgroundColor: "rgba(89, 17, 85, 0.8)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF5CB0",
  },
  headerLogoutText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00ffff",
    marginBottom: 12,
  },
  horizontalDmList: {
    flexDirection: "row",
  },
  inboxCard: {
    backgroundColor: "#1C0A2E",
    padding: 14,
    borderRadius: 16,
    marginRight: 12,
    width: 180,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.2)",
  },
  inboxCardName: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 8,
  },
  chatButton: {
    backgroundColor: "rgba(0, 255, 255, 0.15)",
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
  },
  chatButtonText: {
    color: "#00ffff",
    fontWeight: "bold",
    fontSize: 13,
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
  },
  errorText: {
    color: "#ff4444",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  gridItem: {
    width: "100%",
  },
  gridItemWide: {
    width: "48%",
  },
  neighborhoodItem: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.3)",
  },
  neighborhoodCardImage: {
    width: "100%",
    height: 180,
    justifyContent: "flex-end",
  },
  neighborhoodCardOverlay: {
    padding: 14,
    height: "100%",
    justifyContent: "flex-end",
  },
  neighborhoodName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  neighborhoodType: {
    fontSize: 13,
    color: "#FF5CB0",
    marginBottom: 4,
  },
  neighborhoodDescription: {
    fontSize: 13,
    color: "#CCCCCC",
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#130720",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  emptyStateText: {
    color: "#FFF",
    fontSize: 16,
    marginBottom: 12,
  },
  browseButton: {
    backgroundColor: "rgba(0, 255, 255, 0.2)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00ffff",
  },
  browseButtonText: {
    color: "#00ffff",
    fontWeight: "bold",
  },
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
  },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
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
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    gap: 32,
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
    borderColor: "#FF5CB0",
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
    marginBottom: 16,
  },
  heroSub: {
    color: "#9CA3AF",
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 32,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  bubbleGlass: {
    borderRadius: 48,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FF5CB0",
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
    backgroundColor: "rgba(21, 17, 89, 0.6)",
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 48,
    backgroundColor: "rgba(57, 17, 89, 0.6)",
  },
  thirdButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 48,
    backgroundColor: "rgba(57, 17, 89, 0.6)",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  heroVisualCard: {
    width: "100%",
    backgroundColor: "rgba(19, 23, 31, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
  },
  heroVisualDesktop: {
    flex: 1,
    maxWidth: 480,
  },
  demoGlassCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaFrame: {
    borderRadius: 8,
    overflow: "hidden",
  },
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
    textAlign: "center",
    fontStyle: "italic",
  },
});