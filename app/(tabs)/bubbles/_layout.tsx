// app/(tabs)/bubbles/_layout.tsx
import { Stack } from "expo-router";

export default function BubblesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        contentStyle: { backgroundColor: "#130720" },
      }}
    >
      <Stack.Screen name="../neighborhoods/bubbles/index" />
      <Stack.Screen name="../neighborhoods/bubbles/bublic" />
      <Stack.Screen name="../neighborhoods/bubbles/global" />
    </Stack>
  );
}
