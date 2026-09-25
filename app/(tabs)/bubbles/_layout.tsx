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
    />
  );
}
