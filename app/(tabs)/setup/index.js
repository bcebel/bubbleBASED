// app/neighborhoods/index.js
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  ImageBackground,
  useWindowDimensions,
  ScrollView,
  Platform,
  Pressable,

} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation } from "@apollo/client";
import { BlurView } from "expo-blur";

import Head from "expo-router/head";
import WebTorrentMedia from "@/components/TorrentOnlyMedia";

import { Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GET_NEIGHBORHOODS,
  MY_PERSONAL_BUBBLES,
  JOIN_NEIGHBORHOOD,
  LEAVE_NEIGHBORHOOD,
} from "../../graphql/queries";

const PINATA_GATEWAY = process.env.EXPO_PUBLIC_PINATA_GATEWAY;

export default function NeighborhoodsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const router = useRouter();
    const isDesktop = width >= 768;

  // ✅ Login state
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

  // ✅ Queries (skipped until logged in)
  const { loading: loadingNeighborhoods, error, data, refetch } = useQuery(
    MY_PERSONAL_BUBBLES,
    {
      skip: !isLoggedIn,
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "network-only",
    }
  );

  const [joinNeighborhood] = useMutation(JOIN_NEIGHBORHOOD);
  const [leaveNeighborhood] = useMutation(LEAVE_NEIGHBORHOOD);


const handleJoinNeighborhood = async (neighborhoodId) => {
    try {
      await joinNeighborhood({
        variables: { neighborhoodId },
        refetchQueries: [{ query: MY_PERSONAL_BUBBLES }],
      });
      alert("✅ Joined neighborhood!");
    } catch (err) {
      if (err.message.includes("already a member")) {
        alert("✅ You are already a member of this neighborhood!");
      } else if (err.message.includes("personal neighborhoods")) {
        alert("🔒 This is a personal neighborhood - cannot join");
      } else {
        alert(`Join failed: ${err.message}`);
      }
    }
  };

  const handleLeaveNeighborhood = async (neighborhoodId) => {
    try {
      await leaveNeighborhood({
        variables: { neighborhoodId },
        refetchQueries: [{ query: MY_PERSONAL_BUBBLES }],
      });
      alert("👋 Left neighborhood");
    } catch (err) {
      alert(`Leave failed: ${err.message}`);
    }
  };

  

  // 🚨 Loading state (only after login check)
  if (loading) return <ActivityIndicator size="large" style={styles.loading} />;

  // 🚨 Logged out: Show the preview
  if (!isLoggedIn) {
    return (
            <>
              <Head>
                <title>bubbleBASED  bubbleBASE</title>
                <meta
                  name="description"
                  content="🫧  Your own personal bubbleBASE.  A central hub in a decentralized world.  Enjoy all of the memories you have posted with others."
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
                  Your corner of the internet
                </Text>
              </View>

              <Text style={styles.heroTitle} role="heading" aria-level={1}>
                Your Home Bubble Base  🫧
              </Text>

              <Text style={styles.heroSub}>
                The bubblebase is your home bubble base. Every post you've shared, every bubble you're in, every conversation — it all lands here. It's also where you control how you show up: what each bubble sees, what stays private, and what you share with the world. And if you want to add affiliate links to your profile bubbleBASED will share them throughout the app.
              </Text>

              {/* ACTION BUTTONS (Login / Logout / Join) */}
              <View style={styles.actionsRow}>
                <BlurView intensity={50} tint="dark" style={styles.bubbleGlass}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.replace("/register")}
                  >
                    <Text style={styles.actionButtonText}>
                      Join bubbleBASED
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
                      cid: "QmS1FAg76k1NebtNqa1rvvKv6F7gPno9JSuMfBMHZAXuja",
                      magnetLink:
                        "magnet:?xt=urn:btih:0be343369fd9e2068867040ee31edde8b724944e&dn=video-QmS1FAg76k1NebtNqa1rvvKv6F7gPno9JSuMfBMHZAXuja&tr=wss%3A%2F%2Ftracker-0ad4cca9fd92.herokuapp.com&tr=wss%3A%2F%2Ftracker.files.fm%3A7073%2Fannounce&tr=wss%3A%2F%2Ftracker.webtorrent.dev&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.files.fm%3A7073&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker3.itzmx.com%3A6961%2Fannounce&ws=https%3A%2F%2Ffuchsia-solid-parrot-571.mypinata.cloud%2Fipfs%2FQmS1FAg76k1NebtNqa1rvvKv6F7gPno9JSuMfBMHZAXuja",
                      fileName: "post_1789948957717.mp4",
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
                      yours: "all of it"{" "}
                    </Text>
                    <Text style={styles.mockCodeText}>privacy: "your call" </Text>
                    <Text style={styles.mockCodeText}>links: "we share" </Text>
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
               "There's no place like home"
              </Text>
              <Text style={styles.quoteAuthor}>— Dorothy</Text>
            </BlurView>
          </View>

          {/* FOOTER */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} bubbleBASED.  Click tabs for more info.
            </Text>
          </View>
        </ScrollView>
      </View>
        </>
    );
  }

  // 🚨 Query error state
  if (error) return <Text style={styles.error}>Error: {error.message}</Text>;

  const neighborhoods = data?.myPersonalBubbles || [];

 const renderItem = ({ item }) => {
   return (
     <Link href={`/setup/personal/${item.id}`} asChild>
       <View style={styles.neighborhoodItem}>
         <ImageBackground
           source={
             item.bubblePhotoCid
               ? {
                   uri: `https://${PINATA_GATEWAY}/ipfs/${item.bubblePhotoCid}`,
                 }
               : {
                   uri: "/bbl.jpg" 
                 }
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
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        🏘️ My Bubbles - Click a bubble to enter!
      </Text>


      {neighborhoods.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            You haven't joined any bubbles yet.
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Join bubbles to see them listed here.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.replace(`/bubbles/all`)}
          >
            <Text style={styles.browseButtonText}>Browse Bubbles to Join</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
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
        </ScrollView>
      )}
    </View>
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
    fontSize: 22,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#130720",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00ffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: "#ff8000",
    marginBottom: 20,
  },
  actions: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: "#333",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 48,
    alignItems: "center",
  },
  browseButtonText: {
    color: "#00ffff",
    fontWeight: "bold",
  },
  createButton: {
    backgroundColor: "#33ffff88",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 48,
    alignItems: "center",
  },
  createButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 20,
  },
  neighborhoodItem: {
    borderRadius: 48,
    marginBottom: 15,
    overflow: "hidden",
  },
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
  memberBadge: {
    color: "#B8B0C9",
  },
  neighborhoodDescription: {
    fontSize: 20,
    color: "#CCC",
    marginBottom: 12,
    alignSelf: "center",
  },
  buttonContainer: {
    width: "20%",
    flexDirection: "row",
    gap: 10,
    alignSelf: "center",
  },
  viewButton: {
    backgroundColor: "#F5F2FA",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 48,
    flex: 1,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#151159",
    fontWeight: "bold",
  },
  leaveButton: {
    backgroundColor: "#151159",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 48,
    flex: 1,
    alignSelf: "center",
  },
  leaveButtonText: {
    color: "#F5F2FA",
    fontWeight: "bold",
    alignSelf: "center",
  },
  loading: {
    marginTop: 50,
  },
  error: {
    color: "#151159",
    textAlign: "center",
    marginTop: 20,
  },
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
  emptyStateText: {
    color: "#FFF",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: "#888",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 120, // Adjust this until it clears your tab bar
    flexGrow: 1, // Ensures empty states center properly
  },
  neighborhoodCardImage: {
    width: "100%",
    aspectRatio: 1, // square, scales with whatever width the wrapper gives it
    overflow: "scroll",
    justifyContent: "flex-end",
    borderWidth: 2,
    borderColor: "#008888",
    borderRadius: 48,
  },
  neighborhoodCardOverlay: {
    flex: 1,
    borderRadius: 48,
    aspectRatio: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "center",
    paddingBottom: 120,
  },
  gridItem: {
    width: "100%", // phone: full width, one per row
  },
  gridItemWide: {
    width: "30%", // laptop: two per row
    // or "31%" for three per row
  },
  bubbleGlass: {
    maxWidth: 600,
    alignSelf: "center",

    backgroundColor: "#00ffff", // Semi-transparent background
    borderWidth: 1,
    borderColor: "rgba(255, 0, 129, 0.3)",
    borderRadius: 48,

    // Web only (React Native Web supports this)
    boxShadow:
      "inset 1px 1px 1px 0px rgba(255, 255, 255, 0.6), inset -1px -1px 2px 0px rgba(0, 0, 0, 0.2), 0 12px 32px 0 rgba(0, 0, 0, 0.15)",

    // Web only (Safari needs the prefix)
    backdropFilter: "blur(16px) saturate(190%) brightness(1.1)",
    WebkitBackdropFilter: "blur(16px) saturate(190%) brightness(1.1)",
  },

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
