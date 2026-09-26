import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ApolloProviderWrapper } from "../context/apolloProvider";
import { useColorScheme } from "@/hooks/useColorScheme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, View } from "react-native";
import { inject } from "@vercel/analytics";
import  Head  from "expo-router/head";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const pathname = usePathname();

  if (typeof window !== "undefined") {
    import("@vercel/analytics").then(({ inject }) => inject());
  }

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [loaded] = useFonts({
    Montserrat: require("../assets/fonts/Montserrat-Medium.ttf"),
  });



  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Head>
        <title>bubbleBASED 🫧</title>
        <meta
          name="description"
          content="Join bubblebased.com 🫧 a private social network where you control your privacy, earn from your content, and connect in digital neighborhoods. Bubbly & based."
        />
      </Head>
      <ApolloProviderWrapper>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          {/* ✅ Add semantic roles for the web */}
          <View role="banner" style={{ flex: 0 }}>
            <StatusBar style={isDark ? "light" : "dark"} />
          </View>

          <View role="main" style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor:
                    colorScheme === "dark" ? "#1C0A2E" : "#FFFFFF",
                },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ title: "Login" }} />
              <Stack.Screen name="register" options={{ title: "Register" }} />
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
