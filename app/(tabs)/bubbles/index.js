import React, { useState, useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  ImageBackground,
  useWindowDimensions,
  ScrollView,
  Platform,
  Dimensions,
  Pressable
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation } from "@apollo/client";
import { BlurView } from "expo-blur";
import Head from "expo-router/head";
import { Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MY_NEIGHBORHOODS,
  JOIN_NEIGHBORHOOD,
  LEAVE_NEIGHBORHOOD,
} from "../../graphql/queries";
import WebTorrentMedia from "@/components/TorrentOnlyMedia";

// Import your sibling tab components (Adjust relative paths if needed)
import BublicScreen from "./bublic";
import GlobalScreen from "./global";

const PINATA_GATEWAY = process.env.EXPO_PUBLIC_PINATA_GATEWAY;

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

export default function NeighborhoodsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const router = useRouter();
  const isDesktop = width >= 768;

  // Active Swipe Tab State
  const [activeTab, setActiveTab] = useState(0); // 0: My Bubbles, 1: Bublic, 2: Global
  const horizontalScrollRef = useRef(null);

  const scrollToTab = (index) => {
    setActiveTab(index);
    horizontalScrollRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    if (index !== activeTab) {
      setActiveTab(index);
    }
  };

  // Login state
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

  // Queries
  const { loading: loadingNeighborhoods, error, data } = useQuery(
    MY_NEIGHBORHOODS,
    {
      skip: !isLoggedIn,
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "network-only",
    }
  );

  const [joinNeighborhood] = useMutation(JOIN_NEIGHBORHOOD);
  const [leaveNeighborhood] = useMutation(LEAVE_NEIGHBORHOOD);

  if (loading) return <ActivityIndicator size="large" style={styles.loading} />;

  // Logged out preview state
  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Head>
          <title>bubbleBASED - bubblehub</title>
          <meta
            name="description"
            content="🫧 Make and join bubbles for whatever topic you would like!"
          />
        </Head>
        <ImageBackground
          source={require("@/assets/images/bbl.jpg")}
          style={styles.heroBubble}
          resizeMode="cover"
        />

        <View style={[styles.navContainer, isDesktop ? styles.navDesktop : styles.navMobile]}>
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>bB</Text>
            </View>
            <Text style={styles.brandTitle}>bubbleBASED</Text>
          </View>

          <View style={styles.navLinks}>
            <NavButton title="" />
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
          <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>
            <View style={[styles.heroTextContainer, isDesktop && styles.heroTextDesktop]}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>Your Own Social Network</Text>
              </View>
              <Text style={styles.heroTitle}>Make your own feed 🫧</Text>
              <Text style={styles.heroSub}>
                "Make and join bubbles for whatever topic you would like! Private and public bubbles..."
              </Text>
              <View style={styles.actionsRow}>
                <BlurView intensity={50} tint="dark" style={styles.bubbleGlass}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.replace("/register")}
                  >
                    <Text style={styles.actionButtonText}>Join bubbleBASED</Text>
                  </TouchableOpacity>
                </BlurView>
                <BlurView intensity={50} tint="dark" style={styles.bubbleGlass}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.replace("/login")}
                  >
                    <Text style={styles.actionButtonText}>Log in to make one.</Text>
                  </TouchableOpacity>
                </BlurView>
              </View>
            </View>

            <View style={[styles.heroVisualCard, isDesktop && styles.heroVisualDesktop]}>
              <BlurView intensity={30} tint="dark" style={styles.demoGlassCard}>
                <View style={styles.mediaFrame}>
                  <WebTorrentMedia
                    media={{
                      cid: "QmdBW11LZ34UUwNK5oMSqFdaehLap9gFEGTinhh3WUwYyV",
                      magnetLink: "magnet:?xt=urn:btih:c24538ae212eb0ec480bb190dcd9fd08bb581820...",
                      fileName: "post_1789941035452.mp4",
                      fileType: "video",
                    }}
                    isFocused={true}
                  />
                </View>
              </BlurView>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error) return <Text style={styles.error}>Error: {error.message}</Text>;

  const neighborhoods = data?.myNeighborhoods || [];

  const renderItem = ({ item }) => (
    <Link href={`/neighborhoods/bubbles/${item.id}`} asChild key={item.id}>
      <View style={styles.neighborhoodItem}>
        <ImageBackground
          source={
            item.bubblePhotoCid
              ? { uri: `https://${PINATA_GATEWAY}/ipfs/${item.bubblePhotoCid}` }
              : { uri: "/bbl.jpg" }
          }
          style={styles.neighborhoodCardImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.1)"]}
            style={styles.neighborhoodCardOverlay}
          >
            <Text style={styles.neighborhoodName}>{item.name}</Text>
            <Text style={styles.neighborhoodType}>
              {item.type} • {item.members?.length || 0} members
            </Text>
            <Text style={styles.neighborhoodDescription}>
              About: {item.description}
            </Text>
          </LinearGradient>
        </ImageBackground>
      </View>
    </Link>
  );

  return (
    <View style={styles.container}>
      
      {/* HEADER TAB NAVIGATION BAR */}
      <View style={styles.tabsHeader}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 0 && styles.activeTabButton]}
          onPress={() => scrollToTab(0)}
        >
          <Text style={[styles.headerButtons, activeTab === 0 && styles.activeHeaderText]}>
            My Bubbles
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 1 && styles.activeTabButton]}
          onPress={() => scrollToTab(1)}
        >
          <Text style={[styles.headerButtons, activeTab === 1 && styles.activeHeaderText]}>
            Bublic
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 2 && styles.activeTabButton]}
          onPress={() => scrollToTab(2)}
        >
          <Text style={[styles.headerButtons, activeTab === 2 && styles.activeHeaderText]}>
            Global
          </Text>
        </TouchableOpacity>
      </View>

      {/* HORIZONTAL SWIPE CONTAINER */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* PAGE 1: MY BUBBLES */}
     <View style={{ width, flex: 1 }}>
    <ScrollView 
      nestedScrollEnabled={true} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
          >
            
            <View style={styles.actions}>
              
        <BlurView intensity={50} tint="dark" style={styles.bubbleGlass}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.replace(`/neighborhoods/bubbles/create`)}
          >
            <Text style={styles.createButtonText}>➕ Create New Bubble</Text>
          </TouchableOpacity>
        </BlurView>
      </View>

      {neighborhoods.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            You haven't joined any bubbles yet.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.replace(`/bubbles/all`)}
          >
            <Text style={styles.browseButtonText}>Browse Bubbles to Join</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.grid}>
          {neighborhoods.map((item) => (
            <View
              key={item.id}
              style={[styles.gridItem, isWide && styles.gridItemWide]}
            >
              {renderItem({ item })}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  </View>

        {/* PAGE 2: BUBLIC */}
        <View style={{ width, flex: 1 }}>
          <ScrollView 
      nestedScrollEnabled={true} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
            <BublicScreen />
            </ScrollView>
        </View>

        {/* PAGE 3: GLOBAL */}
<View style={{ width, flex: 1 }}>                 <ScrollView 
      nestedScrollEnabled={true} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
          <GlobalScreen />
            </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#130720",
  },
  tabsHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#130720",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 0, 129, 0.2)",
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: "#00ffff",
  },
  headerButtons: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff00ff",
  },
  activeHeaderText: {
    color: "#00ffff",
  },
  heroTextContainer: { flex: 1 },
  heroBubble: { ...StyleSheet.absoluteFillObject, opacity: 0.75 },
  heroTitle: {
    color: "#F5F2FA",
    fontSize: Platform.OS === "web" ? 44 : 34,
    fontWeight: "800",
    lineHeight: Platform.OS === "web" ? 52 : 42,
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroTextDesktop: { paddingRight: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  actions: {
    flexDirection: "column",
    gap: 10,
    marginVertical: 12,
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
  navMobile: { flexDirection: "column", gap: 16 },
  brandContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FF0081",
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },
  brandTitle: {
    color: "#F5F2FA",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  navLinks: { flexDirection: "row", alignItems: "center", gap: 20 },
  navLinkPressable: { paddingVertical: 4 },
  navLinkText: { color: "#9CA3AF", fontSize: 15, fontWeight: "500" },
  navLinkTextHover: { color: "#FFFFFF" },
  navActionButton: { paddingHorizontal: 16, paddingVertical: 8 },
  navActionButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
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
  tagBadgeText: { color: "#FF5CB0", fontSize: 13, fontWeight: "600" },
  heroSub: { color: "#9CA3AF", fontSize: 18, lineHeight: 28, marginBottom: 32 },
  actionsRow: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginBottom: 24 },
  bubbleGlass: {
    maxWidth: 600,
    alignSelf: "center",
    backgroundColor: "rgba(0, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 129, 0.3)",
    borderRadius: 48,
  },
  bubbleGlassCompact: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 129, 0.3)",
    backgroundColor: "rgba(255, 0, 129, 0.2)",
  },
  browseButton: {
    backgroundColor: "#333",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 48,
    alignItems: "center",
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
  actionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  browseButtonText: { color: "#00ffff", fontWeight: "bold" },
  createButton: {
    backgroundColor: "#33ffff88",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 48,
    alignItems: "center",
  },
  createButtonText: { color: "#ffffff", fontWeight: "bold", fontSize: 20 },
  neighborhoodItem: { borderRadius: 48, marginBottom: 15, overflow: "hidden" },
  neighborhoodName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    margin: 10,
    alignSelf: "center",
  },
  neighborhoodType: {
    fontSize: 18,
    color: "rgba(255, 0, 129, 1)",
    marginBottom: 8,
    alignSelf: "center",
  },
  neighborhoodDescription: {
    fontSize: 20,
    color: "#CCC",
    marginBottom: 12,
    alignSelf: "center",
  },
  loading: { marginTop: 50 },
  error: { color: "#151159", textAlign: "center", marginTop: 20 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#130720",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginTop: 20,
  },
  emptyStateText: { color: "#FFF", fontSize: 18, textAlign: "center", marginBottom: 8 },
  emptyStateSubtext: { color: "#888", fontSize: 20, textAlign: "center", marginBottom: 20 },
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
});