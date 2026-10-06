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
import AdMessage from "../../../components/RandomAd";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
let CARD_WIDTH = SCREEN_WIDTH - 32;
let CAROUSEL_HEIGHT = SCREEN_WIDTH * 0.75;
let AUTHOR = 0;

if (SCREEN_WIDTH > SCREEN_HEIGHT) {
  CAROUSEL_HEIGHT = SCREEN_HEIGHT * 0.8;
  AUTHOR = 100;
}

const BUBBLE_TYPE_COLORS = {
  global: "#ff0081", // pink — matches your accent
  private: "#00ffff", // cyan
  public: "#FFCC00", // the ebubbl yellow
  personal: "#9CA3AF", // gray, since personal is the vault
};

const BUBBLE_TYPE_BORDER_COLORS = {
  private: "#008888",
  global: "#880088",
  public: "#FFCC00",
  personal: "rgba(156, 163, 175, 0.4)",
};

const BUBBLE_TYPE_BACKGROUNDS = {
  private: "rgba(0, 255, 255, 0.06)",
  public: "rgba(255, 0, 129, 0.06)",
  global: "rgba(255, 204, 0, 0.08)",
  personal: "rgba(156, 163, 175, 0.06)",
};
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
      <View style={styles.container}>
        <Head>
          <title>ebubbl - bubblehub</title>
          <meta
            name="description"
            content="🫧 Make and join bubbles for whatever topic you would like!"
          />
        </Head>
        <ImageBackground
          source={require("@/assets/images/bbl.jpg")}
          style={styles.heroBubble}
          resizeMode="cover"
          fetchPriority="high"
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
                <Text style={styles.tagBadgeText}>Your Own Social Network</Text>
              </View>
              <Text style={styles.heroTitle}>Welcome to ebubbl 🫧</Text>
              <Text style={styles.heroSub}>
                "Make and join bubbles for whatever topic you would like!
                Private and public bubbles..."
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
                    <Text style={styles.actionButtonText}>
                      Log in to make one.
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
              <BlurView intensity={30} tint="dark" style={styles.demoGlassCard}>
                <View style={styles.mediaFramey}>
                  <WebTorrentMedia
                    media={{
                      cid: "QmNPmuK8zEW6bM6hsDQSK82dQorXyft5wDKDLSoHo7LXLj",
                      magnetLink:
                        "magnet:?xt=urn:btih:a98117648438fd9089ccaba4a1285f16ff5189db&dn=image-QmNPmuK8zEW6bM6hsDQSK82dQorXyft5wDKDLSoHo7LXLj&tr=wss%3A%2F%2Ftracker-0ad4cca9fd92.herokuapp.com&tr=wss%3A%2F%2Ftracker.files.fm%3A7073%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.files.fm%3A7073&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker3.itzmx.com%3A6961%2Fannounce&ws=https%3A%2F%2Febubbl.com%2Fapi%2Fwebseed%2FQmNPmuK8zEW6bM6hsDQSK82dQorXyft5wDKDLSoHo7LXLj",
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
                      invitation: "BASED"{" "}
                    </Text>
                    <Text style={styles.mockCodeText}>privacy: "BASED" </Text>
                    <Text style={styles.mockCodeText}>context: "BASED" </Text>
                    <Text style={styles.mockCodeText}>bubble: "BASED" </Text>
                  </View>
                </View>
              </BlurView>
            </View>
          </View>

          {/* MARGARET MEAD QUOTE */}
          <View style={styles.quoteSection}>
            <BlurView intensity={40} tint="dark" style={styles.quoteGlassCard}>
              <Text style={styles.quoteText}>
                "The revolution will not be televised"
              </Text>
              <Text style={styles.quoteAuthor}>— Gil Scott-Heron</Text>
            </BlurView>
          </View>

          {/* FOOTER */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} ebubbl. Click tabs for more info.
            </Text>
          </View>
        </ScrollView>
      </View>
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
              <View
                key={neighborhood.id}
                style={[
                  styles.neighborhoodCard,
                  {
                    borderColor:
                      BUBBLE_TYPE_BORDER_COLORS[neighborhood.type] ||
                      "rgba(0, 255, 255, 0.25)",
                    backgroundColor:
                      BUBBLE_TYPE_BACKGROUNDS[neighborhood.type] ||
                      "rgba(89, 17, 85, 0.1)",
                  },
                ]}
              >
                {" "}
                <View style={styles.rowHeaderRow}>
                  <Text style={styles.neighborhoodTitle}>
                    🫧 {neighborhood.name}
                  </Text>
                  <Text
                    style={[
                      styles.neighborhoodTypeBadge,
                      {
                        color:
                          BUBBLE_TYPE_COLORS[neighborhood.type] || "#ff0081",
                      },
                    ]}
                  >
                    {neighborhood.type}
                  </Text>{" "}
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
  neighborhoodCardImage: {
    width: "100%",
    aspectRatio: 1,
    overflow: "scroll",
    justifyContent: "flex-end",
    borderWidth: 2,
    borderColor: "#008888",
    borderRadius: 48,
  },
  neighborhoodCardOverlay: { flex: 1, borderRadius: 48, aspectRatio: 1 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "center",
    paddingBottom: 120,
  },
  gridItem: { width: "100%" },
  gridItemWide: { width: "30%" },
  heroVisualCard: {
    width: "100%",
    backgroundColor: "rgba(19, 23, 31, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    minHeight: 200,
  },
  heroVisualDesktop: { flex: 1, maxWidth: 480 },
  mediaFrame: { borderRadius: 12, overflow: "hidden" },
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
    color: "#FF6EA9",
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
