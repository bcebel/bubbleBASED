// PostComposer.tsx
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, gql } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { CREATE_POST } from "../graphql/queries";
import { uploadToIPFS } from "../utils/uploadHelper";
import webtorrentService from "../../utils/webtorrentService";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const PINATA_GATEWAY = process.env.EXPO_PUBLIC_PINATA_GATEWAY;

// ✅ Add this query for ads
const GET_RANDOM_AFFILIATE_LINK = gql`
  query GetRandomAffiliateLink {
    randomAffiliateLink {
      id
      url
      title
      imageUrl
      description
      clicks
    }
  }
`;

// ✅ Query for posts
const GET_FEED_POSTS = gql`
  query GetFeedPosts($neighborhoodId: ID!) {
    posts(neighborhoodId: $neighborhoodId) {
      id
      content
      author {
        id
        username
        profilePhoto
      }
      media {
        url
        cid
        magnetURI
        mediaType
        fileName
        fileSize
        mimeType
        thumbnailUrl
      }
      createdAt
    }
  }
`;

interface PostComposerProps {
  currentNeighborhoodId?: string;
  currentGroupId?: string | null;
  onPostCreated?: () => void;
}

interface SelectedMedia {
  uri: string;
  mediaType: "image" | "video";
  file?: File;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export default function PostComposer({
  currentNeighborhoodId,
  currentGroupId,
  onPostCreated,
}: PostComposerProps) {
  const params = useLocalSearchParams();
  const router = useRouter();
  const neighborhoodId = params.neighborhoodId || currentNeighborhoodId;
  const [content, setContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  // ✅ Fetch posts for the feed
  const { data: postsData, refetch: refetchPosts } = useQuery(GET_FEED_POSTS, {
    variables: { neighborhoodId },
    skip: !neighborhoodId,
    pollInterval: 5000,
  });

  // ✅ Fetch random ad
  const { data: adData } = useQuery(GET_RANDOM_AFFILIATE_LINK);

  const [createPostMutation] = useMutation(CREATE_POST, {
    context: async () => {
      const token = await AsyncStorage.getItem("token");
      return {
        headers: {
          authorization: token ? `Bearer ${token}` : "",
        },
      };
    },
  });

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const detectedType = asset.type === "video" ? "video" : "image";
      setSelectedMedia({
        uri: asset.uri,
        mediaType: detectedType,
        file: asset.file,
        fileName:
          asset.fileName || // Expo's field
          asset.file?.name || // web's File
          `${detectedType}-${Date.now()}`, // fallback
        fileSize: asset.fileSize ?? asset.file?.size,
        mimeType:
          asset.mimeType || // Expo's field
          asset.file?.type || // web's File
          (detectedType === "video" ? "video/mp4" : "image/jpeg"), // fallback
      });
    }
  };

  const handleSubmit = async () => {
    const hasContent = content.trim().length > 0;
    const hasMedia = !!selectedMedia?.uri;

    if (!hasContent && !hasMedia) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      let extractedCid = null;
      let magnetLink = null;
      let finalMediaUrl = null;
      const currentMediaType = selectedMedia?.mediaType || "image";
      const fileName = selectedMedia?.uri
        ? `post_${Date.now()}.${currentMediaType === "video" ? "mp4" : "jpg"}`
        : null;

      if (selectedMedia?.uri) {
        const uri = selectedMedia.uri;

 if (uri.startsWith("blob:") || uri.startsWith("file:")) {
   // 1. Upload to Pinata
   console.log(`📤 Uploading to Pinata: ${fileName}`);
   const pinataResult = await uploadToIPFS(
     uri,
     fileName ||
       `post_${Date.now()}.${currentMediaType === "video" ? "mp4" : "jpg"}`,
     currentMediaType,
     neighborhoodId,
     selectedMedia?.file,
   );

   const slice = pinataResult?.slices?.[0];
   const extractedCid = slice?.cid || pinataResult?.cid || null;
   if (!extractedCid) throw new Error("Upload returned no CID");

   const finalMediaUrl = `https://${PINATA_GATEWAY}/ipfs/${extractedCid}`;
   console.log(`✅ Pinata upload complete: ${extractedCid}`);

   // 2. Tell the backend to seed it. Fire-and-forget — don't block the post.
   //    The backend fetches from IPFS, hands to ReactiveSeedBooster, and
   //    writes the resulting magnet to the Post's media record.
   // after Pinata upload completes
   await fetch(`${BACKEND_URL}/api/seed-register`, {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${token}`,
     },
     body: JSON.stringify({
       cid: extractedCid,
       fileName,
       fileSize: selectedMedia.fileSize,
       mediaType: currentMediaType,
     }),
   }).catch((err) => console.log("seed-register failed:", err));

   // 3. Create the post with the CID. The magnet will be filled in by
   //    the backend's seed-register response, but the gallery will still
   //    work without it (HTTP fallback via webseed).
   const mediaObject = {
     url: finalMediaUrl,
     cid: extractedCid,
     mediaType: currentMediaType,
     fileName: selectedMedia.fileName,
     fileSize: selectedMedia.fileSize,
     mimeType: selectedMedia.mimeType,
     // No magnetURI here — backend will set it via seed-register
   };

   await createPostMutation({
     variables: {
       input: {
         content,
         feedType: "neighborhood",
         neighborhoodId: currentNeighborhoodId,
         groupId: currentGroupId || null,
         media: [mediaObject],
       },
     },
     context: {
       headers: {
         Authorization: `Bearer ${token}`,
       },
     },
   });

   console.log("✅ Post created, seeding requested");
 } else {
   finalMediaUrl = uri;
 }
      }

      if (!selectedMedia) {
        await createPostMutation({
          variables: {
            input: {
              content,
              feedType: "neighborhood",
              neighborhoodId: currentNeighborhoodId,
              groupId: currentGroupId || null,
              media: [],
            },
          },
          context: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });
      }

      setContent("");
      setSelectedMedia(null);
      refetchPosts();
      onPostCreated?.();
    } catch (error) {
      console.error("❌ Failed to create post:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="What's poppin"
          placeholderTextColor="#888"
          multiline
          value={content}
          onChangeText={setContent}
        />

        {selectedMedia && (
          <View style={styles.previewContainer}>
            {selectedMedia.mediaType === "image" ? (
              <Image
                source={{ uri: selectedMedia.uri }}
                style={styles.previewImage}
              />
            ) : (
              <View style={styles.videoPreviewPlaceholder}>
                <Text style={styles.videoPreviewText}>🎬 Video Selected</Text>
                <Text style={styles.videoUriText} numberOfLines={1}>
                  {selectedMedia.uri}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.removeBadge}
              onPress={() => setSelectedMedia(null)}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.iconBtn} onPress={pickMedia}>
            <Text style={styles.btnText}>📷 Photo/Video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.postBtn,
              !content.trim() && !selectedMedia && styles.postBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || (!content.trim() && !selectedMedia)}
          >
            {loading ? (
              <ActivityIndicator color="#130720" size="small" />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed with Ads */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#130720",
  },
  composer: {
    backgroundColor: "#1A0B2E",
    borderRadius: 12,
    padding: 12,
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  input: {
    color: "#00FFFF",
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    borderColor: "#00FFFF",
  },
  previewContainer: {
    position: "relative",
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 15,
    overflow: "hidden",
    borderColor: "#FF8000",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  videoPreviewPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "rgba(0,255,255,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  videoPreviewText: {
    color: "#00FFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  videoUriText: {
    color: "#8A829E",
    fontSize: 11,
    marginTop: 4,
  },
  removeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  iconBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  btnText: {
    color: "#8A829E",
    fontSize: 13,
  },
  postBtn: {
    backgroundColor: "#00FFFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  postBtnText: {
    color: "#130720",
    fontWeight: "bold",
    fontSize: 14,
  },
  feed: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  postCard: {
    backgroundColor: "#1A0B2E",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  postAuthor: {
    color: "#00FFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  postTime: {
    color: "#666",
    fontSize: 12,
  },
  postContent: {
    color: "#F5F2FA",
    fontSize: 15,
    marginBottom: 8,
  },
  postMedia: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  galleryButtonText: {
    fontSize: 16,
    color: "#00ffff",
  },
});
