import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { gql, useQuery } from "@apollo/client";
import { useRouter, useLocalSearchParams } from "expo-router";
import NeighborhoodLiveStreamRecorder from "../../../components/NeighborhoodLiveStreamRecorder.native";

const GET_ME = gql`
  query GetMe {
    me {
      id
      username
    }
  }
`;

const GET_MY_NEIGHBORHOODS = gql`
  query GetMyNeighborhoods {
    myNeighborhoods {
      id
      name
    }
  }
`;

export default function SelectorScreenNative() {
  const router = useRouter();
  const { neighborhoodId: preselect } = useLocalSearchParams();
  const [selectedHood, setSelectedHood] = useState(preselect || null);
  const [isRecording, setIsRecording] = useState(false);

  const { data: meData } = useQuery(GET_ME);
  const { data: hoodsData, loading: lHoods } = useQuery(GET_MY_NEIGHBORHOODS);

  // 1. If recording, show the native camera
  if (isRecording) {
    return (
      <NeighborhoodLiveStreamRecorder
        neighborhoodId={selectedHood}
        username={meData?.me?.username || "user"}
        onStreamEnd={() => setIsRecording(false)}
      />
    );
  }

  // 2. Otherwise, show the native bubble picker
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Pick a Bubble to Stream To</Text>

      {lHoods ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.picker}>
            {hoodsData?.myNeighborhoods?.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={[styles.item, selectedHood === h.id && styles.selected]}
                onPress={() => setSelectedHood(h.id)}
              >
                <Text style={styles.itemText}>{h.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.goLive}
            onPress={() => {
              if (selectedHood) setIsRecording(true);
              else alert("Pick a bubble first");
            }}
          >
            <Text style={styles.btnText}>Get Ready</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#130720",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 50,
  },
  picker: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginVertical: 20,
  },
  item: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#333",
    margin: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#00FFFF",
  },
  selected: {
    backgroundColor: "#ff375f",
    borderColor: "#ffffff",
    borderWidth: 3,
  },
  itemText: {
    color: "white",
    fontWeight: "600",
  },
  goLive: {
    backgroundColor: "#ff375f",
    paddingVertical: 28,
    paddingHorizontal: 40,
    borderRadius: 15,
    marginTop: 20,
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  backButton: {
    marginTop: 20,
    alignItems: "center",
  },
  backText: {
    color: "#fff",
    fontSize: 20,
  },
});