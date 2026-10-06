// app/(tabs)/neighborhoods/bubbles/invite-links.js
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Clipboard,
  Share,
  Platform,
  ImageBackground,
} from "react-native";
import { BlurView } from "expo-blur";
import { useRouter, useLocalSearchParams, Link } from "expo-router";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_NEIGHBORHOOD_INVITE_LINKS,
  CREATE_INVITE_LINK,
  UPDATE_INVITE_LINK,
  DELETE_INVITE_LINK,
} from "../../../graphql/queries";

export default function InviteLinksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const neighborhoodId = params.neighborhoodId;

  const { loading, data, refetch } = useQuery(GET_NEIGHBORHOOD_INVITE_LINKS, {
    variables: { neighborhoodId },
  });

  const [createInviteLink] = useMutation(CREATE_INVITE_LINK);
  const [updateInviteLink] = useMutation(UPDATE_INVITE_LINK);
  const [deleteInviteLink] = useMutation(DELETE_INVITE_LINK);

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const [linkName, setLinkName] = useState("Invite Link");
  const [maxUses, setMaxUses] = useState("0");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [role, setRole] = useState("member");

  const handleCreateLink = async () => {
    try {
      const expiresInDaysValue = expiresInDays.trim();
      const maxUsesValue = parseInt(maxUses) || 0;

      if (maxUsesValue < 0) {
        Alert.alert("Error", "Max uses cannot be negative");
        return;
      }

      const variables = {
        neighborhoodId,
        name: linkName,
        maxUses: maxUsesValue,
        role,
      };

      if (expiresInDaysValue !== "") {
        const days = parseInt(expiresInDaysValue);
        if (!isNaN(days) && days > 0) {
          variables.expiresInDays = days;
        } else if (days === 0) {
          Alert.alert(
            "Error",
            "Expiration days must be greater than 0, or leave empty for no expiration",
          );
          return;
        }
      }

      await createInviteLink({
        variables,
        update: (cache, { data: { createInviteLink: newLink } }) => {
          const existingData = cache.readQuery({
            query: GET_NEIGHBORHOOD_INVITE_LINKS,
            variables: { neighborhoodId },
          });

          if (existingData && existingData.neighborhoodInviteLinks) {
            cache.writeQuery({
              query: GET_NEIGHBORHOOD_INVITE_LINKS,
              variables: { neighborhoodId },
              data: {
                neighborhoodInviteLinks: [
                  newLink,
                  ...existingData.neighborhoodInviteLinks,
                ],
              },
            });
          }
        },
        refetchQueries: [
          {
            query: GET_NEIGHBORHOOD_INVITE_LINKS,
            variables: { neighborhoodId },
          },
        ],
      });

      Alert.alert("Success", "Invite link created!");
      setIsCreateModalVisible(false);
      resetForm();
      await refetch();
    } catch (error) {
      console.error("Error creating invite link:", error);
      Alert.alert("Error", error.message || "Failed to create invite link");
    }
  };

  const handleCopyLink = async (url) => {
    try {
      if (
        Platform.OS === "web" &&
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        document.hasFocus()
      ) {
        await navigator.clipboard.writeText(url);
        window.alert("Link copied to clipboard");
        return;
      }
      Clipboard.setString(url);
      Alert.alert("Copied!", "Invite link copied to clipboard");
    } catch (err) {
      if (Platform.OS === "web") {
        window.prompt("Copy this link:", url);
      }
    }
  };

  const handleShareLink = async (url, name) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch (err) {
        // user cancelled or share failed — fall through
      }
    }
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        document.hasFocus()
      ) {
        await navigator.clipboard.writeText(url);
        window.alert("Link copied to clipboard");
        return;
      }
    } catch (err) {
      console.warn("Clipboard write failed:", err.message);
    }
    if (Platform.OS === "web") {
      window.prompt("Copy this link:", url);
    } else {
      Share.share({
        message: `Join "${name}": ${url}`,
        url,
        title: name,
      }).catch(() => {});
    }
  };

  const handleDeleteLink = async (linkId) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm("Delete this invite link? This cannot be undone.")
        : await new Promise((resolve) =>
            Alert.alert(
              "Delete Invite Link",
              "Are you sure you want to delete this invite link? This cannot be undone.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            ),
          );

    if (!confirmed) return;

    try {
      await deleteInviteLink({
        variables: { linkId },
        refetchQueries: [
          {
            query: GET_NEIGHBORHOOD_INVITE_LINKS,
            variables: { neighborhoodId },
          },
        ],
      });
      Alert.alert("Success", "Invite link deleted");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleToggleLinkActive = async (link) => {
    try {
      await updateInviteLink({
        variables: {
          linkId: link.id,
          isActive: !link.isActive,
        },
        refetchQueries: [
          {
            query: GET_NEIGHBORHOOD_INVITE_LINKS,
            variables: { neighborhoodId },
          },
        ],
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const resetForm = () => {
    setLinkName("Invite Link");
    setMaxUses("0");
    setExpiresInDays("");
    setRole("member");
  };

  const renderInviteLinkItem = ({ item }) => {
    const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
    const isMaxUses = item.maxUses > 0 && item.uses >= item.maxUses;
    const isActive = item.isActive && !isExpired && !isMaxUses;
    const url = item.url || `https://ebubbl.com/join/${item.code}`;

    return (
      <BlurView
        intensity={40}
        tint="dark"
        style={[styles.linkCard, !isActive && styles.disabledCard]}
      >
        <View style={styles.linkTop}>
          <Text style={styles.linkName}>{item.name}</Text>
          <View style={styles.badges}>
            {!item.isActive && (
              <View style={styles.badgeInactive}>
                <Text style={styles.badgeText}>Off</Text>
              </View>
            )}
            {isExpired && (
              <View style={styles.badgeExpired}>
                <Text style={styles.badgeText}>Expired</Text>
              </View>
            )}
            {isMaxUses && (
              <View style={styles.badgeMax}>
                <Text style={styles.badgeText}>Maxed</Text>
              </View>
            )}
            <View style={styles.badgeRole}>
              <Text style={styles.badgeText}>{item.role}</Text>
            </View>
          </View>
        </View>

        <View style={styles.urlPill}>
          <Text style={styles.urlText} numberOfLines={1} selectable={true}>
            ebubbl.com/join/{item.code}
          </Text>
          <TouchableOpacity
            style={styles.urlCopyBtn}
            onPress={() => handleCopyLink(url)}
          >
            <Text style={styles.urlCopyText}>Copy</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statChip}>
            {item.uses}
            {item.maxUses > 0 ? `/${item.maxUses}` : ""} uses
          </Text>
          {item.expiresAt && (
            <Text style={styles.statChip}>
              Exp {new Date(item.expiresAt).toLocaleDateString()}
            </Text>
          )}
          {item.createdBy && (
            <Text style={styles.statChip}>by {item.createdBy.username}</Text>
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleShareLink(url, item.name)}
          >
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleToggleLinkActive(item)}
          >
            <Text style={styles.actionBtnText}>
              {item.isActive ? "Disable" : "Enable"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() => handleDeleteLink(item.id)}
          >
            <Text style={[styles.actionBtnText, styles.actionBtnDangerText]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00ffff" />
      </View>
    );
  }

  const links = data?.neighborhoodInviteLinks || [];

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("@/assets/images/bbl.webp")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.header}>
          <Link
            href={`/neighborhoods/bubbles/${neighborhoodId}`}
            replace
            asChild
          >
            <TouchableOpacity style={styles.backPill}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
          </Link>

          <Text style={styles.headerTitle}>Invite Links</Text>
          <Text style={styles.headerSubtitle}>
            Share a link to bring people into this bubble
          </Text>

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setIsCreateModalVisible(true)}
          >
            <Text style={styles.createButtonText}>
              + Create New Invite Link
            </Text>
          </TouchableOpacity>
        </View>

        {links.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔗</Text>
            <Text style={styles.emptyTitle}>No invite links yet</Text>
            <Text style={styles.emptySubtext}>
              Create a shareable link and send it to anyone you want in this
              bubble
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => setIsCreateModalVisible(true)}
            >
              <Text style={styles.emptyCtaText}>Create your first link</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={links}
            keyExtractor={(item) => item.id}
            renderItem={renderInviteLinkItem}
            contentContainerStyle={styles.listContent}
            refreshing={loading}
            onRefresh={refetch}
          />
        )}
      </ImageBackground>

      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Invite Link</Text>
              <TouchableOpacity
                onPress={() => setIsCreateModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Link Name</Text>
              <TextInput
                style={styles.textInput}
                value={linkName}
                onChangeText={setLinkName}
                placeholder="e.g., Team Invite, Community Link"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Max Uses (0 = unlimited)</Text>
              <TextInput
                style={styles.textInput}
                value={maxUses}
                onChangeText={setMaxUses}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Role for New Members</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === "member" && styles.roleButtonSelected,
                  ]}
                  onPress={() => setRole("member")}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      role === "member" && styles.roleButtonTextSelected,
                    ]}
                  >
                    Member
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === "moderator" && styles.roleButtonSelected,
                  ]}
                  onPress={() => setRole("moderator")}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      role === "moderator" && styles.roleButtonTextSelected,
                    ]}
                  >
                    Moderator
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateLink}
              >
                <Text style={styles.submitButtonText}>Create Invite Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#130720",
  },
  backgroundImage: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#130720",
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.4)",
    backgroundColor: "rgba(0, 255, 255, 0.08)",
    marginBottom: 16,
  },
  backPillText: {
    color: "#00ffff",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F5F2FA",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: "#FF0081",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#FF0081",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  linkCard: {
    borderRadius: 16,
    overflow: "hidden",
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.2)",
    backgroundColor: "rgba(89, 17, 85, 0.35)",
  },
  disabledCard: {
    opacity: 0.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  linkTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  linkName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#F5F2FA",
    flex: 1,
    marginRight: 10,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badgeInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeExpired: {
    backgroundColor: "rgba(255, 100, 100, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeMax: {
    backgroundColor: "rgba(255, 165, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeRole: {
    backgroundColor: "rgba(0, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: "#F5F2FA",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // URL pill
  urlPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    marginBottom: 10,
  },
  urlText: {
    flex: 1,
    color: "#9CA3AF",
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  urlCopyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0, 255, 255, 0.15)",
  },
  urlCopyText: {
    color: "#00ffff",
    fontSize: 12,
    fontWeight: "700",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  statChip: {
    color: "#9CA3AF",
    fontSize: 11,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  actionBtnText: {
    color: "#F5F2FA",
    fontSize: 13,
    fontWeight: "600",
  },
  actionBtnDanger: {
    backgroundColor: "rgba(255, 55, 95, 0.15)",
    borderColor: "rgba(255, 55, 95, 0.4)",
  },
  actionBtnDangerText: {
    color: "#FF375F",
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F5F2FA",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 320,
  },
  emptyCta: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#FF0081",
  },
  emptyCtaText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1A0B2E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F5F2FA",
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    color: "#F5F2FA",
    fontSize: 24,
  },
  modalBody: {
    paddingTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 8,
    marginTop: 16,
    fontWeight: "600",
  },
  textInput: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    color: "#F5F2FA",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.2)",
  },
  roleButtons: {
    flexDirection: "row",
    gap: 10,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  roleButtonSelected: {
    backgroundColor: "rgba(0, 255, 255, 0.15)",
    borderColor: "#00ffff",
  },
  roleButtonText: {
    color: "#F5F2FA",
    fontSize: 14,
  },
  roleButtonTextSelected: {
    color: "#00ffff",
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#FF0081",
    padding: 16,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
