import React, { useState, useEffect } from "react";
import { useQuery, gql } from "@apollo/client";
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Head from "expo-router/head";
import { useRouter } from "expo-router";

const GET_INBOX = gql`
  query GetInbox {
    myDirectMessageBubbles {
      id
      name
      members {
        user {
          username
        }
      }
    }
  }
`;

const GET_ME = gql`
  query GetMe {
    me {
      username
    }
  }
`;

export default function InboxScreen() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem("token");
      setIsLoggedIn(!!token);
      setAuthChecked(true);
    };
    checkLogin();
  }, []);

  // ✅ skip queries until we know we're logged in
  const { data, loading, error } = useQuery(GET_INBOX, {
    fetchPolicy: "network-only",
    skip: !isLoggedIn,
  });
  const { data: meData } = useQuery(GET_ME, { skip: !isLoggedIn });
  const myUsername = meData?.me?.username;

  // 1. auth not resolved yet
  if (!authChecked) {
    return (
      <ActivityIndicator size="large" color="#00ffff" style={styles.loading} />
    );
  }

  // 2. logged out → marketing page
  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>bubbleBASED - Inbox</title>
          <meta
            name="description"
            content="Your direct messages, all in one place. Private conversations between you and the people you actually want to talk to."
          />
        </Head>
        <View style={styles.container}>
          <ImageBackground
            source={require("@/assets/images/bbl.jpg")}
            style={styles.heroBubble}
            resizeMode="cover"
          />
          <View style={styles.centered}>
            <Text style={styles.marketingText}>Your Inbox</Text>
          </View>
          <View style={styles.centered}>
            <Text style={styles.marketingText}>
              Direct conversations, no strangers
            </Text>
          </View>
          <View style={styles.centered}>
            <Text style={styles.marketingText}>Private by design</Text>
          </View>
          <View style={styles.centered}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.loginButtonText}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  // 3. logged in → actual app
  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  const inboxBubbles = data?.myDirectMessageBubbles || [];

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#00ffff" }}>
        📩 Inbox
      </Text>

      <FlatList
        data={inboxBubbles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const otherUsers = item.members.filter(
            (member) => member.user.username !== myUsername,
          );

          const displayName = otherUsers
            .map((m) => m.user.username)
            .join(" ↔ ");
          return (
            <View
              style={{
                padding: 15,
                backgroundColor: "#1C0A2E",
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                {displayName}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `/neighborhoods/bubbles/neighborhood-chat?neighborhoodId=${item.id}`,
                  )
                }
              >
                <Text style={{ color: "#00ffff", marginTop: 5 }}>
                  Open Chat
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { marginTop: 50 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  marketingText: { color: "#fff", fontSize: 18 },
  heroBubble: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  loginButton: {
    backgroundColor: "#00FFFF",
    padding: 15,
    borderRadius: 30,
    width: "80%",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 85,
  },
  loginButtonText: {
    color: "#130720",
    fontWeight: "bold",
    fontSize: 18,
  },
});
