import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef, lazy, Suspense } from "react"; // 👈 Added useState, useRef
import { useColorScheme } from "@/hooks/useColorScheme";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Platform, View, StyleSheet, PermissionsAndroid } from "react-native";
import Head from "expo-router/head";
import AsyncStorage from "@react-native-async-storage/async-storage";


// Correct import pattern for Vercel on Expo Web
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { ApolloProviderWrapper } from "../context/apolloProvider";

// 👈 Import your Native Recorder!
const NativeRecorder = lazy(
  () => import("../components/NeighborhoodLiveStreamRecorder.native"),
);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // 👈 State to hold the native camera params
  const [nativeRecorderParams, setNativeRecorderParams] = useState(null);
  const webViewRef = useRef(null);

  const [loaded] = useFonts({
    Montserrat: require("../assets/fonts/Montserrat-Medium.ttf"),
  });

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

        if (grantedCamera && grantedAudio) {
          request.grant(request.resources);
        } else {
          request.deny();
        }
      } catch (err) {
        console.warn("WebView permission error:", err);
        request.deny();
      }
    } else {
      request.grant(request.resources);
    }
  };

  // 👈 Listen for the message from the web app
  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "OPEN_NATIVE_RECORDER") {
        console.log("🚀 Web asked for native camera:", data);
        setNativeRecorderParams({
          neighborhoodId: data.neighborhoodId,
          username: data.username,
          token: data.token, // 👈 Save it
        });
      }
    } catch (e) {
      // Ignore non-JSON messages
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname && pathname !== "/") {
      window.__hideSplash?.();
    }
  }, [pathname]);

  useEffect(() => {
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

  // 2. NATIVE RECORDER VERSION (Android/iOS)
  // If the web requested the camera, we render the native component instead of the WebView!
    // 2. NATIVE RECORDER VERSION (Android/iOS)
    // If the web requested the camera, we render the native component instead of the WebView!
 if (nativeRecorderParams) {
   // Save the token to AsyncStorage so the Native Apollo Client can find it
   if (nativeRecorderParams.token) {
     AsyncStorage.setItem("token", nativeRecorderParams.token);
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
  

  // 3. WEBVIEW VERSION (Default App Mode)
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
        onMessage={onMessage} // 👈 Connected the bridge here
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#130720" },
  webview: { flex: 1, backgroundColor: "#130720" },
});
