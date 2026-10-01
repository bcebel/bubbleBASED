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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useQuery, gql } from "@apollo/client";
import WebTorrentMedia from "../../../components/WebTorrentMedia";
import { Image } from "expo-image";
import AdMessage from "../../../components/AdMessage";

let { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
let CARD_WIDTH = SCREEN_WIDTH - 32;
let CAROUSEL_HEIGHT = SCREEN_WIDTH * 0.75;
let AUTHOR = 0;

if (SCREEN_WIDTH > SCREEN_HEIGHT) {
  CAROUSEL_HEIGHT = SCREEN_HEIGHT * 0.8;
  AUTHOR = 100;
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
  const isGif = item.fileName?.toLowerCase().endsWith(".gif");

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
function BubbleCarousel({ posts }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

const mediaItems = useMemo(() => {
  const items = [];
  for (const post of posts) {
    const hasMedia = post.media?.some((m) => m.cid);

    if (!hasMedia && post.content?.trim()) {
      // text-only post
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
  return items;
}, [posts]);

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
          return (
            <View
              key={`${item.id}-${index}`}
              style={{ width: CARD_WIDTH, height: CAROUSEL_HEIGHT }}
            >
              {item.isTextOnly ? (
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
              ) : (
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
              )}
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

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("token");
      setIsLoggedIn(!!token);
      setLoadingToken(false);
    })();
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

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require("@/assets/images/bbl.webp")}
          style={styles.heroBubble}
          resizeMode="cover"
        />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Media Gallery 🫧</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const userNeighborhoods = neighborhoodsData?.myNeighborhoods || [];

 

  return (
    <View style={styles.container}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.mainGroupTitle}>Your Bubble Galleries</Text>
        {userNeighborhoods.filter(
          (n) => (postsByNeighborhood[n.id] || []).length > 0,
        ).length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateText}>
              No media in your bubbles yet.
            </Text>
          </View>
        ) : (
          userNeighborhoods
            .filter((n) => (postsByNeighborhood[n.id] || []).length > 0)
            .map((neighborhood) => {
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
                  <BubbleCarousel posts={posts} />
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
  heroBubble: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
  heroSection: { padding: 40, alignItems: "center" },
  heroTitle: { color: "#fff", fontSize: 24, marginBottom: 20 },
  loginButton: { backgroundColor: "#00ffff", padding: 12, borderRadius: 20 },
  loginButtonText: { color: "#000", fontWeight: "bold" },
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
});
