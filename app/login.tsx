import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native";
import Head from "expo-router/head";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearApolloStore } from "@/context/apolloProvider"; // Adjust path if needed

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    // Clear previous error on new attempt
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setErrorMessage("Please fill in all fields");
      return;
    }

    // Light tap when initiating action
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
          mutation LoginUser($username: String!, $password: String!) {
            loginUser(username: $username, password: $password) {
              token
              user {
                id
                username
                email
                profilePhoto
              }
            }
          }
        `,
          variables: { username, password },
        }),
      });

      const data = await response.json();

      if (data.data?.loginUser?.token) {
        const { token, user } = data.data.loginUser;

        // Trigger heavy success feedback before state updates
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        await clearApolloStore();
        await AsyncStorage.multiRemove([
          "token",
          "username",
          "userId",
          "apollo-cache-persist",
        ]);

        await AsyncStorage.multiSet([
          ["token", token],
          ["username", user.username],
          ["userId", user.id],
        ]);

        router.replace("/gallery");
      } else {
        const err = data.errors?.[0]?.message || "Invalid username or password";
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMessage(err);
      }
    } catch (error) {
      console.error("Login error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Log In | bubbleBASED</title>
        <meta
          name="description"
          content="Welcome back to your digital neighborhoods. Log in to see what your bubbles have been up to."
        />
      </Head>
      <View style={styles.container}>
        <ImageBackground
          source={require("@/assets/images/bbl.webp")}
          style={styles.heroBubble}
          resizeMode="cover"
        />
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Enter bubbleBASED</Text>

        <View style={styles.form}>
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <RNTextInput
              style={[styles.input, errorMessage && styles.inputError]}
              placeholder="Enter your username"
              placeholderTextColor="#888"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <RNTextInput
              style={[styles.input, errorMessage && styles.inputError]}
              placeholder="Enter your password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage(null);
              }}
              secureTextEntry
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#130720" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/register");
            }}
          >
            <Text style={styles.linkText}>New here? Create an account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/forgotpassword");
            }}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/");
            }}
          >
            <Text style={styles.linkText}>Return to Homepage</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#130720",
    justifyContent: "center",
  },
  heroBubble: { width: "100%", height: "100%", position: "absolute" },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#00ffff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 25,
    color: "#ff0081",
    textAlign: "center",
    marginBottom: 30,
    opacity: 0.8,
  },
  form: {
    marginHorizontal: 10,
  },
  errorContainer: {
    backgroundColor: "rgba(255, 0, 129, 0.15)",
    borderWidth: 1,
    borderColor: "#ff0081",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#ff0081",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#00ffff",
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    borderWidth: 2,
    borderColor: "#00ffff",
    borderRadius: 12,
    backgroundColor: "#111111",
    padding: 15,
    fontSize: 16,
    color: "#00ffff",
  },
  inputError: {
    borderColor: "#ff0081",
  },
  button: {
    backgroundColor: "#00ffff",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    height: 58,
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#130720",
    fontSize: 18,
    fontWeight: "bold",
  },
  linkButton: {
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  linkText: {
    color: "#00ffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
