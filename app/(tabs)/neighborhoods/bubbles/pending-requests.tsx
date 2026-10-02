// app/neighborhoods/bubbles/pending-requests.tsx
import React from "react";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { useQuery, useMutation, gql } from "@apollo/client";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

const GET_PENDING = gql`
  query NeighborhoodPendingRequests($neighborhoodId: ID!) {
    neighborhoodPendingRequests(neighborhoodId: $neighborhoodId) {
      id
      user {
        id
        username
        profilePhoto
      }
      requestedAt
    }
  }
`;

const APPROVE = gql`
  mutation ApproveJoinRequest($neighborhoodId: ID!, $userId: ID!) {
    approveJoinRequest(neighborhoodId: $neighborhoodId, userId: $userId) {
      id
    }
  }
`;

const REJECT = gql`
  mutation RejectJoinRequest($neighborhoodId: ID!, $userId: ID!) {
    rejectJoinRequest(neighborhoodId: $neighborhoodId, userId: $userId)
  }
`;

export default function PendingRequestsScreen() {
  const { neighborhoodId } = useLocalSearchParams();
  const router = useRouter();

  const { data, loading, error, refetch } = useQuery(GET_PENDING, {
    variables: { neighborhoodId },
    fetchPolicy: "cache-and-network",
  });

  const [approve] = useMutation(APPROVE);
  const [reject] = useMutation(REJECT);

  const handleApprove = async (userId) => {
    try {
      await approve({ variables: { neighborhoodId, userId } });
      await refetch();
    } catch (err) {
      alert("Approve failed: " + err.message);
    }
  };

  const handleReject = async (userId) => {
    try {
      await reject({ variables: { neighborhoodId, userId } });
      await refetch();
    } catch (err) {
      alert("Reject failed: " + err.message);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00ffff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error.message}</Text>
      </View>
    );
  }

  const requests = data?.neighborhoodPendingRequests || [];

  return (
    <View style={styles.container}>
      <Link href={`/neighborhoods/bubbles/${neighborhoodId}`} replace asChild>
        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to Bubble</Text>
        </TouchableOpacity>
      </Link>

      <Text style={styles.title}>Pending Requests</Text>

      {requests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No pending requests.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image
                source={{
                  uri:
                    item.user.profilePhoto || "https://via.placeholder.com/50",
                }}
                style={styles.avatar}
              />
              <View style={styles.info}>
                <Text style={styles.username}>@{item.user.username}</Text>
                <Text style={styles.timestamp}>
                  Requested{" "}
                  {new Date(parseInt(item.requestedAt)).toLocaleString()}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleApprove(item.user.id)}
                >
                  <Text style={styles.btnText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleReject(item.user.id)}
                >
                  <Text style={styles.btnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#130720", padding: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#130720",
  },
  error: { color: "#FF5555", fontSize: 16 },
  backButton: { padding: 8, marginBottom: 8 },
  backButtonText: { color: "#fff", fontSize: 20 },
  title: {
    color: "#00ffff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#888", fontSize: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#333",
  },
  info: { flex: 1 },
  username: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  timestamp: { color: "#888", fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  approveBtn: { backgroundColor: "#00AA00" },
  rejectBtn: { backgroundColor: "#FF3333" },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
