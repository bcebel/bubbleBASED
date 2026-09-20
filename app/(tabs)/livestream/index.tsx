import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { gql, useQuery, useSubscription } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Head from "expo-router/head";
import NeighborhoodLiveStreamPlayer from "../../../components/NeighborhoodLiveStreamPlayer";
import { warehouse } from "../../../components/StreamWearhouse.js";
import { useRouter } from "expo-router";

const API_BASE = "https://minnowspacebackend-e6635e46c3d0.herokuapp.com";

const GET_ACTIVE_LIVESTREAMS = gql`
  query GetActiveLivestreams {
    streams(status: "live") {
      id
      title
      sessionId
      status
      createdAt
    }
  }
`;

const LIVESTREAM_CHUNK_SUBSCRIPTION = gql`
  subscription OnLivestreamChunkAdded($sessionId: String!) {
    livestreamChunkAdded(sessionId: $sessionId) {
      id
      sessionId
      chunkIndex
      magnetLink
      fileName
      fileType
      fileSize
      thumbnailUrl
      rotation
    }
  }
`;

// --- INDIVIDUAL STREAM PLAYER ITEM ---
function StreamItem({ stream }: { stream: any }) {
  const [availableInWarehouse, setAvailableInWarehouse] = useState<number[]>(
    [],
  );
  const sessionId = stream?.sessionId;

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isiPhone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const shouldRotate = isSafari || isiPhone;
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let isMounted = true;

    const fetchRotation = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/stream-rotation/${sessionId}`);
        const data = await res.json();
        if (isMounted) setRotation(data.rotation || 0);
      } catch (e) {}
    };

    fetchRotation();
    const interval = setInterval(fetchRotation, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let interval: NodeJS.Timeout;

    const findInitialData = async () => {
      const chunksToGet = [-1, 0];
      let foundCount = 0;

      for (const idx of chunksToGet) {
        if (availableInWarehouse.includes(idx)) {
          foundCount++;
          continue;
        }
        try {
          const res = await fetch(
            `${API_BASE}/api/live-chunk/${sessionId}/${idx}`,
          );
          if (res.ok) {
            const bytes = await res.arrayBuffer();
            await warehouse.saveChunk(sessionId, idx, new Uint8Array(bytes));
            setAvailableInWarehouse((prev) => [...new Set([...prev, idx])]);
            foundCount++;
          }
        } catch (e) {}
      }

      if (foundCount === 2) clearInterval(interval);
    };

    interval = setInterval(findInitialData, 3000);
    findInitialData();

    return () => clearInterval(interval);
  }, [sessionId]);

  useSubscription(LIVESTREAM_CHUNK_SUBSCRIPTION, {
    variables: { sessionId },
    skip: !sessionId,
    onData: async ({ data }) => {
      const chunk = data.data?.livestreamChunkAdded;
      if (!chunk) return;
      if (chunk.rotation) setRotation(chunk.rotation);

      try {
        const res = await fetch(
          `${API_BASE}/api/live-chunk/${sessionId}/${chunk.chunkIndex}`,
        );
        if (res.ok) {
          const bytes = await res.arrayBuffer();
          await warehouse.saveChunk(
            sessionId,
            chunk.chunkIndex,
            new Uint8Array(bytes),
          );
          setAvailableInWarehouse((prev) => [
            ...new Set([...prev, chunk.chunkIndex]),
          ]);
        }
      } catch (e) {}
    },
  });

  if (!sessionId) return null;

  return (
    <View style={styles.streamContainer}>
      <View style={styles.infoOverlay}>
        <Text style={styles.streamTitle}>{stream.title}</Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <NeighborhoodLiveStreamPlayer
        sessionId={sessionId}
        availableInWarehouse={availableInWarehouse}
        rotation={shouldRotate ? rotation : 0}
      />
    </View>
  );
}

// --- TAB SCREEN ROUTE ---
export default function StreamsScreen() {
  const router = useRouter();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

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

  const { data: streamsData, loading } = useQuery(GET_ACTIVE_LIVESTREAMS, {
    pollInterval: 5000,
    skip: !isLoggedIn,
  });

  // 1. auth not resolved yet
  if (!authChecked) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // 2. logged out → marketing page
  if (!isLoggedIn) {
    return (
      <>
        <Head>
          <title>bubbleBASED - Livestream</title>
          <meta
            name="description"
            content="Live streams from your bubbles. Peer-to-peer video, no middlemen, no replay tracking. Watch what your people are sharing right now."
          />
        </Head>
        <View style={styles.mainWrapper}>
          <ImageBackground
            source={require("@/assets/images/bbl.jpg")}
            style={styles.heroBubble}
            resizeMode="cover"
          />
          <View style={styles.marketingCenter}>
            <Text style={styles.marketingText}>Live from your bubbles</Text>
          </View>
          <View style={styles.marketingCenter}>
            <Text style={styles.marketingText}>
              Peer-to-peer video, no middlemen
            </Text>
          </View>
          <View style={styles.marketingCenter}>
            <Text style={styles.marketingText}>
              No replay tracking, no audience metrics
            </Text>
          </View>
          <View style={styles.marketingCenter}>
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
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <FlatList
        data={streamsData?.streams || []}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <View style={{ height: SCREEN_HEIGHT, width: "100%" }}>
            <StreamItem stream={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.noStreamsText}>No active streams nearby</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.goLiveButton}
        onPress={() => router.push("/livestream/selector")}
      >
        <Text style={styles.goLiveButtonText}>+ Go Live</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#130720" },
  centerContainer: {
    flex: 1,
    backgroundColor: "#130720",
    justifyContent: "center",
    alignItems: "center",
  },
  streamContainer: { width: "100%", height: "100%" },
  infoOverlay: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  streamTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 10,
  },
  liveBadge: {
    backgroundColor: "#ff375f",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: { color: "white", fontSize: 12, fontWeight: "bold" },
  noStreamsText: { color: "white", fontSize: 18 },
  goLiveButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#ff375f",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    zIndex: 20,
  },
  goLiveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  // marketing-only styles
  marketingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  marketingText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  heroBubble: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.75,
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
