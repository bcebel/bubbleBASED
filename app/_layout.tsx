import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useColorScheme } from "@/hooks/useColorScheme";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, View, StyleSheet } from "react-native";
import Head from "expo-router/head";

// Web-only analytics
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { ApolloProviderWrapper } from "../context/apolloProvider";

// 🚨 ONLY IMPORT NATIVE STUFF ON MOBILE 🚨
let WebView = null;
let PermissionsAndroid = null;
let NativeRecorder = null;

if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
  PermissionsAndroid = require("react-native").PermissionsAndroid;
  NativeRecorder = lazy(() =>
    require("../components/NeighborhoodLiveStreamRecorder.native"),
  );
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Bridge state for native camera
  const [nativeRecorderParams, setNativeRecorderParams] = useState(null);
  const webViewRef = useRef(null);

  const [loaded] = useFonts({
    Montserrat: require("../assets/fonts/Montserrat-Medium.ttf"),
  });

  // 🚨 ORIGINAL SPLASH SCREEN LOGIC 🚨
  // 🚨 FIXED SPLASH SCREEN LOGIC 🚨
useEffect(() => {
  if (loaded) {
    SplashScreen.hideAsync();
  }
}, [loaded]);
  // Web-only analytics
  useEffect(() => {
    if (Platform.OS === "web") {
      inject();
      injectSpeedInsights();
    }
  }, []);

  // Bridge: Handle permission requests from the WebView (Android)
  const handlePermissionRequest = async (event) => {
    const { request } = event.nativeEvent;
    if (Platform.OS === "android") {
      try {
        const hasCameraPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        const hasAudioPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        let grantedCamera = hasCameraPermission;
        let grantedAudio = hasAudioPermission;

        if (!hasCameraPermission || !hasAudioPermission) {
          const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
          grantedCamera =
            result["android.permission.CAMERA"] ===
            PermissionsAndroid.RESULTS.GRANTED;
          grantedAudio =
            result["android.permission.RECORD_AUDIO"] ===
            PermissionsAndroid.RESULTS.GRANTED;
        }

        if (grantedCamera && grantedAudio) request.grant(request.resources);
        else request.deny();
      } catch (err) {
        request.deny();
      }
    } else {
      request.grant(request.resources);
    }
  };

  // Bridge: Listen for the "Open Native Recorder" message from the WebView
  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "OPEN_NATIVE_RECORDER") {
        setNativeRecorderParams({
          neighborhoodId: data.neighborhoodId,
          username: data.username,
          token: data.token,
        });
      }
    } catch (e) {}
  };

  // 1. WEB VERSION
  if (Platform.OS === "web") {
    return (
      <SafeAreaProvider>
        <Head>
          <title>ebubbl 🫧 p2p Bubbles</title>
          <meta
            name="description"
            content="Join ebubbl.com 🫧 a private social network where you control your privacy, earn from your content, and connect in digital neighborhoods. Bubbly & based."
          />
        </Head>
        <ApolloProviderWrapper>
          <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <View role="banner" style={{ flex: 0 }}>
              <StatusBar style={isDark ? "light" : "dark"} />
            </View>
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
  }

  // 2. NATIVE RECORDER BRIDGE (Android/iOS)
  // If the web requested the camera, render the native component
  if (nativeRecorderParams && NativeRecorder) {
    // Save the token so the Native Apollo Client can authenticate
    if (nativeRecorderParams.token) {
      require("@react-native-async-storage/async-storage").default.setItem(
        "token",
        nativeRecorderParams.token,
      );
    }

    return (
      <SafeAreaProvider>
        <ApolloProviderWrapper>
          <Suspense
            fallback={<View style={{ flex: 1, backgroundColor: "#000" }} />}
          >
            <NativeRecorder
              neighborhoodId={nativeRecorderParams.neighborhoodId}
              username={nativeRecorderParams.username}
              onStreamEnd={() => {
                setNativeRecorderParams(null);
                webViewRef.current?.reload();
              }}
            />
          </Suspense>
        </ApolloProviderWrapper>
      </SafeAreaProvider>
    );
  }

  // 3. WEBVIEW (Default App Mode)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <WebView
        ref={webViewRef}
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
        onPermissionRequest={handlePermissionRequest}
        onMessage={onMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#130720" },
  webview: { flex: 1, backgroundColor: "#130720" },
});
