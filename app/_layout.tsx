import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "@/hooks/useColorScheme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import {
  Platform,
  View,
  SafeAreaView,
  StyleSheet,
  } from "react-native";
import Head from "expo-router/head";

// Correct import pattern for Vercel on Expo Web
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { ApolloProviderWrapper } from "../context/apolloProvider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const pathname = usePathname();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // ⚡ Optimization: Use web-optimized formats for web if possible, or swap TTF out entirely
  const [loaded] = useFonts({
    Montserrat: require("../assets/fonts/Montserrat-Medium.ttf"),
  });

  useEffect(() => {
    console.log("[splash] pathname:", pathname);
    if (typeof window === "undefined") return;
    if (pathname && pathname !== "/") {
      console.log("[splash] hiding");
      window.__hideSplash?.();
    }
  }, [pathname]);

  useEffect(() => {
    // ⚡ Optimization: Initialize Vercel Analytics only once on the client side
    if (Platform.OS === "web") {
      inject();
      injectSpeedInsights();
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // ❌ REMOVED: if (!loaded) return null;
  // This ensures Google Bot sees HTML immediately instead of a blank screen.
  // 1. If we are on the web, render the normal React Native Web app
  if (Platform.OS === "web") {
    return (
      <SafeAreaProvider>
        <Head>
          <title>ebubbl 🫧 p2p Bubbles</title>
          <meta
            name="description"
            content="Join ebubbl.com 🫧 a private social network where you control your privacy, earn from your content, and connect in digital neighborhoods. Bubbly & based."
          />
          {/* ⚡ Optimization: Ensure fonts don't cause layout shifts */}
          <style>{`
          body {
            font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
            font-display: swap; 
          }
        `}</style>
        </Head>
        <ApolloProviderWrapper>
          <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <View role="banner" style={{ flex: 0 }}>
              <StatusBar style={isDark ? "light" : "dark"} />
            </View>

            {/* ⚡ Content renders immediately even if font is downloading */}
            <View role="main" style={{ flex: 1 }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor: isDark ? "#1C0A2E" : "#FFFFFF",
                  },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ title: "Login" }} />
                <Stack.Screen name="register" options={{ title: "Register" }} />
                <Stack.Screen
                  name="forgotpassword"
                  options={{ title: "Forgotpassword" }}
                />
                <Stack.Screen
                  name="reset-password"
                  options={{ title: "Reset-password" }}
                />
                <Stack.Screen
                  name="+not-found"
                  options={{ title: "Not Found" }}
                />
              </Stack>
            </View>
          </ThemeProvider>
        </ApolloProviderWrapper>
      </SafeAreaProvider>
    );
  };

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <WebView
          source={{ uri: "https://ebubbl.com" }}
          style={styles.webview}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          originWhitelist={["*"]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
        />
      </SafeAreaView>
    );

}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#130720" },
  webview: { flex: 1, backgroundColor: "#130720" },
});

