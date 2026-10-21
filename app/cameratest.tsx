import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function CameraTest() {
  const [permission, requestPermission] = useCameraPermissions();

  // 1. If we don't know the permission status yet, show nothing
  if (!permission) {
    return <View style={styles.container} />;
  }

  // 2. If it's not granted, show a button to ask for it
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need camera access to test this.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. If granted, render the camera
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onMountError={(error) => console.log("Camera Error:", error)}
      />
      <Text style={styles.overlay}>Camera is ON</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#00ffff",
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: "#000",
    fontWeight: "bold",
  },
  camera: {
    flex: 1, // ⚠️ THIS IS CRITICAL. If it doesn't have flex/height, it won't show.
    width: "100%",
  },
  overlay: {
    color: "#fff",
    position: "absolute",
    bottom: 50,
  },
});
