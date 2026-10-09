// FeedItem.tsx - Updated
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  FlatList
} from "react-native";
import AffiliateCard from "./AffiliateCard";
import WebTorrentMedia from "./WebTorrentMedia";
import { useMutation, useQuery, gql } from "@apollo/client";
import { DELETE_POST, GET_COMMENTS } from "../app/graphql/queries";
import CommentSection from "./CommentSection";
import { canModerate } from "../app/utils/permissions";
import { GET_NEIGHBORHOOD_INFO } from "../app/graphql/queries";
const getFileType = (fileName = "") => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "avif", "heic", "heif", "webp", "svg"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "video";
  return "unknown";
};

const GET_ME_ID = gql`
  query GetMeId {
    me {
      id
    }
  }
`;


const GET_MY_NEIGHBORHOODS = gql`
  query GetMyNeighborhoods {
    myNeighborhoods {
      id
      name
      type
    }
  }
`;


const SHARE_POST = gql`
  mutation SharePost($postId: ID!, $targetNeighborhoodId: ID!) {
    sharePost(postId: $postId, targetNeighborhoodId: $targetNeighborhoodId) {
      id
      content
      neighborhood {
        id
        name
      }
    }
  }
`;

function SharePicker({ visible, post, onClose, onShare }) {
  const { data, loading } = useQuery(GET_MY_NEIGHBORHOODS, {
    skip: !visible,
    fetchPolicy: "cache-first",
  });

  const bubbles = (data?.myNeighborhoods || []).filter(
    (b) => b.id !== post?.neighborhood?.id,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Share to...</Text>

          {loading ? (
            <ActivityIndicator />
          ) : bubbles.length === 0 ? (
            <Text style={styles.empty}>No other bubbles to share to.</Text>
          ) : (
            <FlatList
              data={bubbles}
              keyExtractor={(b) => b.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bubbleRow}
                  onPress={() => onShare(item.id)}
                >
                  <Text style={styles.bubbleName}>{item.name}</Text>
                  <Text style={styles.bubbleType}>{item.type}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const PINATA_GATEWAY =
  process.env.EXPO_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";

// ✅ Copy the function from neighborhood-chat
const getProfilePhotoUrl = (profilePhoto) => {
  if (!profilePhoto) {
    return "https://via.placeholder.com/40";
  }

  if (profilePhoto.startsWith("http")) {
    return profilePhoto;
  }

  if (profilePhoto.startsWith("blob:")) {
    return profilePhoto;
  }

  if (profilePhoto.startsWith("Qm") || profilePhoto.startsWith("baf")) {
    return `https://${PINATA_GATEWAY}/ipfs/${profilePhoto}`;
  }

  return `https://${PINATA_GATEWAY}/ipfs/${profilePhoto}`;
};

function resolveMediaUrl(mediaItem) {
  if (!mediaItem) return null;

  if (typeof mediaItem === "string") {
    if (mediaItem.startsWith("http")) {
      return mediaItem.replace("ipfs.filebase.io", PINATA_GATEWAY);
    }
    return `https://${PINATA_GATEWAY}/ipfs/${mediaItem}`;
  }

  if (mediaItem.ipfsUrl) {
    return mediaItem.ipfsUrl.replace("ipfs.filebase.io", PINATA_GATEWAY);
  }

  if (mediaItem.cid) {
    return `https://${PINATA_GATEWAY}/ipfs/${mediaItem.cid}`;
  }

  if (mediaItem.url) {
    return mediaItem.url.startsWith("http")
      ? mediaItem.url.replace("ipfs.filebase.io", PINATA_GATEWAY)
      : `https://${PINATA_GATEWAY}/ipfs/${mediaItem.url}`;
  }

  return null;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "";
  const date = new Date(isNaN(timestamp) ? timestamp : Number(timestamp));
  const diffInSeconds = Math.floor((new Date() - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default function FeedItem({ post, onLike, onComment, onDelete, muted = true }) {
  if (!post) return null;
  const { data: hoodData } = useQuery(GET_NEIGHBORHOOD_INFO, {
    variables: { id: post.neighborhood?.id },
    skip: !post.neighborhood?.id,
  });
  const [sharePost, { loading: sharing }] = useMutation(SHARE_POST);
  const [showSharePicker, setShowSharePicker] = useState(false);
  const handleShare = async (targetNeighborhoodId) => {
    try {
      await sharePost({
        variables: { postId: post.id, targetNeighborhoodId },
      });
      setShowSharePicker(false);
      onDelete?.(); // reuse the same "refetch feed" callback
    } catch (err) {
      alert("Share failed: " + err.message);
    }
  };
  const { data: meData } = useQuery(GET_ME_ID);
  const currentUserId = meData?.me?.id;
  const isOwner = post.author?.id === currentUserId;
  const members = hoodData?.neighborhood?.members || [];
  const myMember = members.find((m) => m.user?.id === currentUserId);
  const authorMember = members.find((m) => m.user?.id === post.author?.id);

  const isSelf = post.author?.id === currentUserId;
  const canShare = isSelf; // sharing is author-only per your earlier constraint
  const canDelete = canModerate(myMember?.role, authorMember?.role, isSelf);

  const { author, content, createdAt, media, affiliate } = post;
  const [commentCount, setCommentCount] = useState(0);
  const { data } = useQuery(GET_COMMENTS, {
    variables: { postId: post.id },
    fetchPolicy: "cache-first",
  });

  const getMediaKey = (media) => {
    if (media?.magnetLink) {
      const match = media.magnetLink.match(/btih:([a-zA-Z0-9]+)/);
      if (match) return match[1];
    }
    return media?.cid || media?.fallbackUrl || media?.fileName || "unknown";
  };

  // Update count when data arrives
  useEffect(() => {
    if (data?.comments) {
      setCommentCount(data.comments.length);
    }
  }, [data]);
  // ✅ Use the fixed profile photo function
  const avatarUri = getProfilePhotoUrl(author?.profilePhoto);
  const [deletePost] = useMutation(DELETE_POST);
  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePost({
          variables: { postId: post.id },
        });
        // Refresh the feed
        onDelete?.();
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };
  return (
    <View style={styles.feedItemContainer}>
      {/* Post Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: avatarUri }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.username}>{author?.username || "Anonymous"}</Text>
          <Text style={styles.timestamp}>{formatTimeAgo(createdAt)}</Text>
          <View style={styles.actionBar}>
            {canShare && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowSharePicker(true)}
              >
                <Text style={styles.actionIcon}>Share ↗️</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                <Text style={styles.actionIcon}>Delete 🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {content ? <Text style={styles.content}>{content}</Text> : null}

      {media && media.length > 0 && (
        <View style={styles.mediaContainer}>
          {media.map((item, index) => {
            const fallbackUrl = resolveMediaUrl(item);

            const normalizedMedia = {
              cid: item.cid,
              magnetLink: item.magnetLink || item.magnetURI || null,
              fallbackUrl: fallbackUrl,
              ipfsUrl: fallbackUrl,
              fileType:
                item.fileType ||
                item.mediaType ||
                getFileType(item.fileName) ||
                "image",
              fileName: item.fileName || `media-${item.cid}`,
              slices: item.slices || null,
            };

            return (
              <View
                key={`${post.id}-media-${index}`}
                style={styles.mediaWrapper}
              >
                <WebTorrentMedia
                  key={getMediaKey(normalizedMedia)}
                  media={normalizedMedia}
                  isFocused={true}
                  muted={muted}
                />
              </View>
            );
          })}
        </View>
      )}

      {affiliate && <AffiliateCard affiliate={affiliate} />}

      <CommentSection
        postId={post.id}
        initialCount={commentCount}
        onCommentCountChange={setCommentCount}
      />
      <SharePicker
        visible={showSharePicker}
        post={post}
        onClose={() => setShowSharePicker(false)}
        onShare={handleShare}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  feedItemContainer: {
    backgroundColor: "#1E1035",
    borderRadius: 12,
    padding: 1,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255,128,0,0.15)", // 🧡 Orange accent
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 48,
    backgroundColor: "#130720",
    borderWidth: 2,
    borderColor: "#00ffff", //
  },
  headerTextContainer: {
    marginLeft: 10,
  },
  username: {
    color: "#00ffff", //
    fontSize: 18,
    fontWeight: "700",
  },
  timestamp: {
    color: "#FF99FF", // 🧡 Orange tint
    fontSize: 13,
    marginTop: 1,
    opacity: 0.9,
  },
  content: {
    color: "#E0D8F0",
    fontSize: 15,
    lineHeight: 21,
    margin: 15,
  },
  mediaContainer: {
    borderRadius: 8,
    overflow: "hidden",
    gap: 1,
  },
  mediaWrapper: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#130720",
    borderRadius: 8,
    overflow: "hidden",
 
  },
  actionBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,128,0,0.1)", // 🧡 Orange tint
    marginTop: 10,
    paddingTop: 8,
    justifyContent: "flex-end",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  actionIcon: {
    fontSize: 14,
    marginRight: 6,
    color: "#fff", // 🧡 Orange
  },
  actionLabel: {
    color: "#8A829E",
    fontSize: 12,
    fontWeight: "600",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1E1035",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255, 128, 0, 0.3)",
    padding: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  title: {
    color: "#00ffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  empty: {
    color: "#8A829E",
    fontSize: 15,
    textAlign: "center",
    paddingVertical: 30,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#130720",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.2)",
  },
  bubbleName: {
    color: "#F5F2FA",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  bubbleType: {
    color: "#FF99FF",
    fontSize: 12,
    opacity: 0.8,
    marginLeft: 10,
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255, 55, 95, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 55, 95, 0.4)",
  },
  cancelText: {
    color: "#ff375f",
    fontSize: 16,
    fontWeight: "600",
  },
});
