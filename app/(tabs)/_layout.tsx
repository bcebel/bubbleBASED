import { Tabs } from "expo-router";
import React, { useState, useEffect } from "react";
import { Text, View, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // (tabs)/_layout.tsx
  const [wakeKey, setWakeKey] = useState(0);
  useEffect(() => {
 const onVisible = () => {
   if (document.visibilityState !== "visible") return;
   if (window.globalWebTorrentClient) {
     try {
       window.globalWebTorrentClient.destroy();
     } catch {}
     window.globalWebTorrentClient = null;
   }
   setWakeKey((k) => k + 1);
 };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Then wrap the tabs (or each screen's content) in <View key={wakeKey}>

  return (
    <Tabs
      key={wakeKey}
      // ✅ Tells web browsers this entire bar is a navigation zone
      role="navigation"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarBackground: () => (
          <BlurView
            intensity={60}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: {
          backgroundColor: "transparent",
          position: "absolute",
          height: Platform.OS === "ios" ? 40 + insets.bottom : 50,
          paddingBottom: Platform.OS === "ios" ? insets.bottom : 0,
          paddingTop: 0,
          borderTopWidth: 0,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: () => (
            // Removed role="heading" to keep web layout semantics correct
            <View style={styles.bubbleGlass}>
              <Text style={styles.iconText}>👋</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="neighborhoods/index"
        options={{
          tabBarIcon: () => (
            <View style={styles.bubbleGlass}>
              <Text style={styles.iconText}>🫧</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          tabBarIcon: () => (
            <View style={styles.bubbleGlass}>
              <Text style={styles.iconText}>🖼️</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="livestream"
        options={{
          tabBarIcon: () => (
            <View style={styles.bubbleGlass}>
              <Text style={styles.iconText}>📺</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="selector"
        options={{
          tabBarIcon: () => (
            <View style={styles.bubbleGlass}>
              <Text style={styles.iconText}>📺</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          tabBarIcon: () => (
            <View style={styles.bubbleGlass}>
              <Text style={styles.iconText}>📩</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="setup"
        options={{
          tabBarIcon: () => (
            <View style={styles.bubbleGlass}>
              <Text style={styles.iconText}>😀</Text>
            </View>
          ),
        }}
      />
      {/* Hidden screens - leave them exactly as they are */}
      <Tabs.Screen name="PostComposer" options={{ href: null }} />
      <Tabs.Screen
        name="neighborhoods/bubbles/PostFeed"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="neighborhoods/bubbles/neighborhood-postfeed"
        options={{ href: null }}
      />
      <Tabs.Screen name="neighborhoods/staticParams" options={{ href: null }} />
      <Tabs.Screen
        name="neighborhoods/bubbles/neighborhood-chat"
        options={{ href: null }}
      />
      <Tabs.Screen name="neighborhoods/bubbles/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="neighborhoods/bubbles/create"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="neighborhoods/bubbles/invite-links"
        options={{ href: null }}
      />
      <Tabs.Screen name="setup/setup" options={{ href: null }} />{" "}
      <Tabs.Screen name="setup/personal/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="neighborhoods/bubbles/neighborhood-members"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="neighborhoods/bubbles/neighborhood-gallery"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="neighborhoods/bubbles/neighborhoodgallery"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bubbleGlass: {
    backgroundColor: "rgba(255, 0, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 129, 0.3)",
    borderRadius: 48,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 55,
    minHeight: 55,
    boxShadow:
      "inset 1px 1px 1px 0px rgba(255,255,255,0.6), inset -1px -1px 2px 0px rgba(0,0,0,0.2), 0 12px 32px 0 rgba(0,0,0,0.15)",
    backdropFilter: "blur(16px) saturate(190%) brightness(1.1)",
    WebkitBackdropFilter: "blur(16px) saturate(190%) brightness(1.1)",
  },
  iconText: {
    fontSize: 24,
    color: "white",
  },
});
