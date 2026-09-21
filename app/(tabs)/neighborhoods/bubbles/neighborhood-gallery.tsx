import React from "react";
import { StyleSheet, TouchableOpacity, Text } from "react-native";
import { useLocalSearchParams, Link } from "expo-router";
import NeighborhoodGallery from "./neighborhoodgallery";

export default function NeighborhoodGalleryScreen() {
  const params = useLocalSearchParams();
  const neighborhoodId = params.neighborhoodId as string;

  return <> <Link href={`/neighborhoods/bubbles/${neighborhoodId}`} replace asChild>
          <TouchableOpacity style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Bubble</Text>
          </TouchableOpacity>
  </Link><NeighborhoodGallery neighborhoodId={neighborhoodId} />
    </>;
}

const styles = StyleSheet.create({
  backButton: {
    color: "#fff",
  },
  backButtonText: {
    fontSize: 20,
    color: "#fff",
    padding: 12,
  },
});
