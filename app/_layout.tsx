
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ApolloProviderWrapper } from "../context/apolloProvider";
import { useColorScheme } from "@/hooks/useColorScheme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, View } from "react-native";
import Head from "expo-router/head";

// Correct import pattern for Vercel on Expo Web
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";

export default function RootLayout() {
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // ⚡ Optimization: Use web-optimized formats for web if possible, or swap TTF out entirely
  const [loaded] = useFonts({
    Montserrat: require("../assets/fonts/Montserrat-Medium.ttf"),
  });


 
    useEffect(() => {
      // ⚡ Optimization: Initialize Vercel Analytics only once on the client side
      if (Platform.OS === "web") {
        inject();
        injectSpeedInsights();
      }
    }, []);

useEffect(() => {
  SplashScreen.hideAsync().catch(() => {});
  if (typeof window !== "undefined" && window.__hideSplash) {
    window.__hideSplash();
  }
}, []);
    return (
      <SafeAreaProvider>
        <Head>
          <title>ebubbl 🫧</title>
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
\
              <Stack.Screen
                name="+not-found"
                options={{ title: "Not Found" }}
              />
            </Stack>
          </View>
        </ApolloProviderWrapper>
      </SafeAreaProvider>
    );
  }
