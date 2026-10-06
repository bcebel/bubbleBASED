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
} from "../../../graphql/queries";
import WebTorrentMedia from "@/components/WebTorrentMedia";

// Import your sibling tab components (Adjust relative paths if needed)
import BublicScreen from "./bublic";
import GlobalScreen from "./global";

const PINATA_GATEWAY = process.env.EXPO_PUBLIC_PINATA_GATEWAY;

const BUBBLE_TYPE_COLORS = {
  global: "#d79008",   // pink — matches your accent
  private: "#67bed9",    // cyan
  public: "#cf8fad",    // the ebubbl yellow
  personal: "#9CA3AF",  // gray, since personal is the vault
};

const BUBBLE_TYPE_BORDER_COLORS = {
  global: "#d96769",
  private: "#67bed977",
  public: "#c467d977",
  personal: "rgba(156, 163, 175, 0.4)",
};

const BUBBLE_TYPE_BACKGROUNDS = {
  global: "#2d231c",
  private: "#E9F2EE",
  public: "#4f4415",
  personal: "rgba(156, 163, 175, 0.3)",
};

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
  // Rounds to the nearest page as soon as you drag > 50% across
  const index = Math.round(scrollPosition / width);
  if (index !== activeTab && index >= 0 && index <= 2) {
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

        <View style={[styles.navContainer, isDesktop ? styles.navDesktop : styles.navMobile]}>
        <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>e🫧</Text>
            </View>
            <Text style={styles.brandTitle}>ebubbl</Text>
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
              <Text style={styles.heroTitle}>Welcome to ebubbl 🫧</Text>
              <Text style={styles.heroSub}>
                "Make and join bubbles for whatever topic you would like! Private and public bubbles..."
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
                              © {new Date().getFullYear()} ebubbl.  Click tabs for more info.
                            </Text>
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
            <Text style={[styles.neighborhoodType, { color: BUBBLE_TYPE_COLORS[item.type] }]}>
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
        onScroll={handleScroll}
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
  style={[
    styles.gridItem,
    isWide && styles.gridItemWide,
    {
      borderColor: BUBBLE_TYPE_BORDER_COLORS[item.type] || "rgba(0, 255, 255, 0.25)",
      backgroundColor: BUBBLE_TYPE_BACKGROUNDS[item.type] || "rgba(89, 17, 85, 0.1)",

      borderWidth: 1,
      borderRadius: 48,
      overflow: "hidden",
      padding: 0,
    },
  ]}
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
    borderBottomColor: "#E9F2EE",
  },
  headerButtons: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#b1b092",
  },
  activeHeaderText: {
    color: "#E9F2EE",
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
    width: 46,
    height: 46,
    borderRadius: 20,
    backgroundColor: "#fffff",
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
    borderWidth: .1,
    borderColor: "rgba(255, 0, 129, 0.4)",
  },
  tagBadgeText: { color: "#FF5CB0", fontSize: 13, fontWeight: "600" },
  heroSub: { color: "#9CA3AF", fontSize: 18, lineHeight: 28, marginBottom: 32 },
  actionsRow: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginBottom: 24 },
  bubbleGlass: {
    maxWidth: 600,
    alignSelf: "center",
    backgroundColor: "rgba(0, 255, 255, 0.15)",
    borderWidth: .1,
    borderColor: "rgba(255, 0, 129, 0.3)",
    borderRadius: 48,
  },
  bubbleGlassCompact: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: .1,
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
  neighborhoodItem: { borderRadius: 48, overflow: "hidden" },
  neighborhoodName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    margin: 10,
    alignSelf: "center",
  },
  neighborhoodType: {
    fontSize: 18,

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
    borderWidth: .1,
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
    borderWidth: .1,
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
    borderWidth: .1,
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
  neighborhoodCard: {},
});