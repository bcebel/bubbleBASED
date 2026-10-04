// app/(tabs)/gallery.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import Head from "expo-router/head";
import { BlurView } from "expo-blur";
import { useQuery, gql } from "@apollo/client";
import WebTorrentMedia from "../../../components/WebTorrentMedia";
import { Image } from "expo-image";
import AdMessage from "../../../components/AdMessage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
let CARD_WIDTH = SCREEN_WIDTH - 32;
let CAROUSEL_HEIGHT = SCREEN_WIDTH * 0.75;
let AUTHOR = 0;

if (SCREEN_WIDTH > SCREEN_HEIGHT) {
  CAROUSEL_HEIGHT = SCREEN_HEIGHT * 0.8;
  AUTHOR = 100;
}

// ─── NAV BUTTON (used in the splash) ─────────────────────
function NavButton({ title }) {
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

// ─── QUERIES ─────────────────────────────────────────────
const MY_NEIGHBORHOODS = gql`
  query MyNeighborhoods {
    myNeighborhoods {
      id
      name
      type
    }
  }
`;

const GET_MY_NEIGHBORHOODS_POSTS = gql`
  query GetMyNeighborhoodsPosts {
    myNeighborhoodsPosts {
      id
      content
      createdAt
      author {
        id
        username
        profilePhoto
      }
      neighborhood {
        id
        name
      }
      media {
        _id
        cid
        url
        magnetURI
        mediaType
        fileName
        fileSize
        mimeType
      }
    }
  }
`;

const GET_RANDOM_AFFILIATE_LINK = gql`
  query GetRandomAffiliateLink {
    randomAffiliateLink {
      id
      url
      title
      imageUrl
      description
      clicks
    }
  }
`;

// ─── HELPERS ─────────────────────────────────────────────
const getFileType = (item) => {
  if (!item) return "unknown";
  if (item.mediaType) return item.mediaType;
  if (item.fileType) return item.fileType;
  const fileName = item.fileName;
  if (!fileName) return "unknown";
  const lower = fileName.toLowerCase();
  if (lower.match(/\.(mp4|mov|webm|avi|mkv)$/)) return "video";
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff|avif|heic|heif|svg)$/))
    return "image";
  return "unknown";
};

// ─── MEDIA DISPLAY ───────────────────────────────────────
const MediaDisplay = ({ item, isFocused, isAlmostFocused }) => {
  const fileType = getFileType(item);
  const isImage = fileType === "image";
  const isVideo = fileType === "video";

  const displayUrl = item.cid
    ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/webseed/${item.cid}`
    : null;

  if (!displayUrl) {
    return (
      <View style={styles.noMedia}>
        <Text style={styles.noMediaText}>No media URL available</Text>
      </View>
    );
  }

  if (item.magnetLink && (isImage || isVideo)) {
    return (
      <View style={styles.magnetContainer}>
        <WebTorrentMedia
          media={{ ...item, fileType }}
          isFocused={isFocused}
          isAlmostFocused={isAlmostFocused}
        />
      </View>
    );
  }

  if (isImage) {
    return (
      <View style={styles.fixedMediaWrapper}>
        <Image
          source={{ uri: displayUrl }}
          style={styles.standardImage}
          contentFit="contain"
          transition={300}
          cachePolicy="memory-disk"
        />
      </View>
    );
  }

  if (isVideo) {
    return (
      <View style={styles.fixedMediaWrapper}>
        <WebTorrentMedia
          media={{ ...item, fileType }}
          isFocused={isFocused}
          isAlmostFocused={isAlmostFocused}
        />
      </View>
    );
  }

  return null;
};

// ─── BUBBLE CAROUSEL ─────────────────────────────────────
function BubbleCarousel({ posts, ad }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const mediaItems = useMemo(() => {
    const items = [];
    for (const post of posts) {
      const hasMedia = post.media?.some((m) => m.cid);

      if (!hasMedia && post.content?.trim()) {
        items.push({
          id: `text-${post.id}`,
          isTextOnly: true,
          content: post.content,
          postId: post.id,
          createdAt: post.createdAt,
          author: post.author,
          neighborhood: post.neighborhood,
          cid: null,
        });
        continue;
      }

      for (const m of post.media || []) {
        if (!m.cid) continue;
        items.push({
          id: m._id || m.cid,
          cid: m.cid,
          url: m.url,
          magnetLink: m.magnetURI,
          fileType: m.mediaType,
          fileName: m.fileName,
          mimeType: m.mimeType,
          postId: post.id,
          content: post.content,
          createdAt: post.createdAt,
          author: post.author,
          neighborhood: post.neighborhood,
        });
      }
    }

    // Insert one ad at position 4, only if the bubble has enough content
    if (ad && items.length >= 6) {
      items.splice(4, 0, {
        isAd: true,
        id: `ad-${ad.id}`,
        ad,
      });
    }

    return items;
  }, [posts, ad]);

  const handleScroll = (e) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    if (newIndex !== activeIndex) setActiveIndex(newIndex);
  };

  if (mediaItems.length === 0) {
    return (
      <View style={styles.emptyRow}>
        <Text style={styles.emptyRowText}>No media yet</Text>
      </View>
    );
  }

  return (
    <View style={{ height: CAROUSEL_HEIGHT }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
      >
        {mediaItems.map((item, index) => {
          const isFocused = index === activeIndex;
          const isAlmostFocused = Math.abs(index - activeIndex) <= 3;

          // ─── AD CARD ───
          if (item.isAd) {
            return (
              <View
                key={`${item.id}-${index}`}
                style={{
                  width: CARD_WIDTH,
                  height: CAROUSEL_HEIGHT,
                  padding: 8,
                }}
              >
                <AdMessage ad={item.ad} />
              </View>
            );
          }

          // ─── TEXT-ONLY CARD ───
          if (item.isTextOnly) {
            return (
              <View
                key={`${item.id}-${index}`}
                style={{ width: CARD_WIDTH, height: CAROUSEL_HEIGHT }}
              >
                <View style={styles.textPostContainer}>
                  <ScrollView
                    contentContainerStyle={styles.textScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.textPostContent}>{item.content}</Text>
                  </ScrollView>
                  <View style={styles.textPostFooter}>
                    <Text style={styles.textPostMeta}>
                      🫧 {item.author?.username || "unknown"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }

          // ─── MEDIA CARD ───
          return (
            <View
              key={`${item.id}-${index}`}
              style={{ width: CARD_WIDTH, height: CAROUSEL_HEIGHT }}
            >
              <View style={{ flex: 1, width: "100%", height: "100%" }}>
                <MediaDisplay
                  item={item}
                  isFocused={isFocused}
                  isAlmostFocused={isAlmostFocused}
                />
                <View style={styles.mediaFooter}>
                  <Text style={styles.mediaFooterText}>
                    🫧 {item.author?.username || "unknown"}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────
export default function GalleryScreen() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingToken, setLoadingToken] = useState(true);

  const isDesktop = SCREEN_WIDTH >= 768;

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem("token");
      setIsLoggedIn(!!token);
      setLoadingToken(false);
    };
    checkLogin();
  }, []);

  const { data: neighborhoodsData, loading: loadingNeighborhoods } = useQuery(
    MY_NEIGHBORHOODS,
    { skip: !isLoggedIn, fetchPolicy: "cache-and-network" },
  );

  const { data: postsData, loading: loadingPosts } = useQuery(
    GET_MY_NEIGHBORHOODS_POSTS,
    { skip: !isLoggedIn, fetchPolicy: "cache-and-network" },
  );

  const { data: adData } = useQuery(GET_RANDOM_AFFILIATE_LINK, {
    skip: !isLoggedIn,
  });

  const postsByNeighborhood = useMemo(() => {
    const buckets = {};
    (postsData?.myNeighborhoodsPosts || []).forEach((post) => {
      const nid = post.neighborhood?.id;
      if (!nid) return;
      if (!buckets[nid]) buckets[nid] = [];
      buckets[nid].push(post);
    });
    return buckets;
  }, [postsData]);

  if (loadingToken || (isLoggedIn && loadingNeighborhoods)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00ffff" />
      </View>
    );
  }

  // ─── LOGGED OUT SPLASH ─────────────────────────────────
  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>ebubbl - gallery</title>
          <meta
            name="description"
            content="🫧 Beautiful gallery of all media posted throughout your bubbles."
          />
        </Head>
        <View style={styles.splashContainer}>
          <ImageBackground
            source={require("@/assets/images/bbl.webp")}
            style={styles.heroBubble}
            resizeMode="cover"
          />

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
                  Welcome to ebubbl 🫧
                </Text>

                <Text style={styles.heroSub}>
                  Instead of every video loading from a massive data center,
                  users help host the content they're watching.
                </Text>

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
                      <Text style={styles.actionButtonText}>Join ebubbl</Text>
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
                        Log in to see yours.
                      </Text>
                    </TouchableOpacity>
                  </BlurView>
                </View>
              </View>

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
                  <View style={styles.mediaFrame}>
                    <WebTorrentMedia
                      media={{
                        cid: "QmZd15VPt9KXtn9svRk77LrheBtu9Gkhdv9ALphug9C3L3",
                        magnetLink:
                          "magnet:?xt=urn:btih:b4496f8e52e074b5a233814b0cd83785211a1393&dn=video-QmZd15VPt9KXtn9svRk77LrheBtu9Gkhdv9ALphug9C3L3",
                        fileName: "post_1789941383843.mp4w",
                        fileType: "video",
                      }}
                      isFocused={true}
                    />
                  </View>

                  <View style={styles.mockContentBox}>
                    <Text style={styles.mockCodeText}>// ebubbl</Text>
                    <Text style={styles.mockCodeTextAccent}>
                      video: "shared"
                    </Text>
                    <Text style={styles.mockCodeText}>photo: "shared"</Text>
                    <Text style={styles.mockCodeText}>network: "shared"</Text>
                    <Text style={styles.mockCodeText}>bubble: "based"</Text>
                  </View>
                </BlurView>
              </View>
            </View>

            <View style={styles.quoteSection}>
              <BlurView
                intensity={40}
                tint="dark"
                style={styles.quoteGlassCard}
              >
                <Text style={styles.quoteText}>
                  "The best thing about a picture is that it never changes, even
                  when the people in it do."
                </Text>
                <Text style={styles.quoteAuthor}>— Andy Warhol</Text>
              </BlurView>
            </View>

            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>
                © {new Date().getFullYear()} bubbleBASED.
              </Text>
            </View>
          </ScrollView>
        </View>
      </>
    );
  }

  // ─── LOGGED IN GALLERY ─────────────────────────────────
  const userNeighborhoods = neighborhoodsData?.myNeighborhoods || [];
  const visibleNeighborhoods = userNeighborhoods.filter(
    (n) => (postsByNeighborhood[n.id] || []).length > 0,
  );

  return (
    <View style={styles.container}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.mainGroupTitle}>Your Bubble Galleries</Text>
        {visibleNeighborhoods.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateText}>
              No media in your bubbles yet.
            </Text>
          </View>
        ) : (
          visibleNeighborhoods.map((neighborhood) => {
            const posts = postsByNeighborhood[neighborhood.id] || [];
            return (
              <View key={neighborhood.id} style={styles.neighborhoodCard}>
                <View style={styles.rowHeaderRow}>
                  <Text style={styles.neighborhoodTitle}>
                    🫧 {neighborhood.name}
                  </Text>
                  <Text style={styles.neighborhoodTypeBadge}>
                    {neighborhood.type}
                  </Text>
                </View>
                <BubbleCarousel
                  posts={posts}
                  ad={adData?.randomAffiliateLink}
                />
              </View>
            );
          })
        )}
        {loadingPosts && (
          <ActivityIndicator color="#00ffff" style={{ marginTop: 20 }} />
        )}
      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────
const styles = StyleSheet.create({
  // Gallery container
  container: { flex: 1, backgroundColor: "rgba(89, 17, 85, 0.1)" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(89, 17, 85, 0.1)",
  },
  scrollContent: { padding: 16, paddingBottom: 120 },
  mainGroupTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ff00ff",
    marginTop: 12,
    marginBottom: 16,
  },
  neighborhoodCard: {
    backgroundColor: "rgba(89, 17, 85, 0.1)",
    borderRadius: 10,
    borderWidth: 2,
    padding: 5,
    marginBottom: 5,
    borderColor: "rgba(0,255,255, .25)",
  },
  rowHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    marginBottom: 10,
  },
  neighborhoodTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff" },
  neighborhoodTypeBadge: {
    fontSize: 11,
    color: "#ff0081",
    fontWeight: "bold",
    backgroundColor: "rgba(89, 17, 85, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    textTransform: "uppercase",
  },
  emptyRow: {
    height: CAROUSEL_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyRowText: { color: "#666", fontStyle: "italic", fontSize: 14 },
  emptyStateCard: {
    padding: 30,
    alignItems: "center",
    backgroundColor: "rgba(89, 17, 85, 0.6)",
    borderRadius: 16,
  },
  emptyStateText: { color: "#ccc", fontSize: 16 },
  magnetContainer: { width: "100%", height: "100%" },
  fixedMediaWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  standardImage: { width: "100%", height: "100%" },
  noMedia: { flex: 1, justifyContent: "center", alignItems: "center" },
  noMediaText: { color: "#F5F2FA", fontSize: 14 },
  textPostContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(89, 17, 85, 0.1)",
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: "space-between",
  },
  textScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  textPostContent: {
    color: "#F5F2FA",
    fontSize: 19,
    lineHeight: 28,
    textAlign: "center",
    maxWidth: 500,
  },
  textPostFooter: {
    position: "absolute",
    bottom: AUTHOR,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textPostMeta: {
    color: "#F5F2FA",
    fontSize: 20,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  mediaFooter: {
    position: "absolute",
    bottom: AUTHOR,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mediaFooterText: {
    color: "#F5F2FA",
    fontSize: 20,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  mediaFooterBubble: {
    color: "#00ffff",
    fontSize: 11,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },

  // ─── Splash screen styles ──────────────────────────────
  splashContainer: {
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

  // Nav
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
    color: "#FFCC00",
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

  // Hero
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    flexDirection: "column",
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

  // Buttons
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
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Visual card
  heroVisualCard: {
    width: "100%",
    backgroundColor: "rgba(19, 23, 31, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    minHeight: 200,
  },
  heroVisualDesktop: {
    flex: 1,
    maxWidth: 480,
  },
  demoGlassCard: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    padding: 12,
    backgroundColor: "rgba(13, 16, 23, 0.85)",
  },
  mediaFrame: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 12,
  },
  peerBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  peerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  mockTerminalBox: {
    backgroundColor: "#0D1017",
    borderRadius: 8,
    overflow: "hidden",
  },
  terminalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    gap: 6,
  },
  terminalTitle: {
    color: "#6B7280",
    fontSize: 11,
    marginLeft: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mockContentBox: {
    padding: 10,
    gap: 4,
  },
  mockCodeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#6B7280",
    fontSize: 13,
  },
  mockCodeTextAccent: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#10B981",
    fontSize: 13,
    fontWeight: "600",
  },

  // Quote
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
