import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { gql, useQuery } from "@apollo/client";
import WebTorrentMedia from "../components/WebTorrentMedia";
import AdMessage from "./AdMessage";
import { updatePriorityWindow } from "../components/torrentmanager";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width;
const MEDIA_SIZE = width - 40;

const GET_ALL_GALLERY = gql`
  query GetMyAllNeighborhoodsGallery {
    getMyAllNeighborhoodsGallery {
      videos {
        id
        title
        cid
        description
        fileName
        ipfsUrl
        magnetLink
        createdAt
        user {
          username
          profilePhoto
        }
        neighborhood {
          id
          name
        }
      }
      images {
        id
        title
        description
        fileName
        cid
        ipfsUrl
        magnetLink
        createdAt
        user {
          username
          profilePhoto
        }
        neighborhood {
          id
          name
        }
      }
      totalCount
    }
  }
`;




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

const getFileType = (fileName: string) => {
  if (!fileName) return "unknown";
  fileName = fileName.toLowerCase();
  if (
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".mov") ||
    fileName.endsWith(".webm") ||
    fileName.endsWith(".avi") ||
    fileName.endsWith(".mkv")
  )
    return "video";
  if (
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".gif") ||
    fileName.endsWith(".webp") ||
    fileName.endsWith(".bmp") ||
    fileName.endsWith(".tiff") ||
    fileName.endsWith(".avif") ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif") ||
    fileName.endsWith(".svg")
  )
    return "image";
  return "unknown";
};
/*
const MediaDisplay = ({
  item,
  isFocused,
  isAlmostFocused,
  onMediaAspectChange,
}: {
  item: any;
  isFocused: boolean;
  isAlmostFocused: boolean;
  onMediaAspectChange: (ratio: number) => void;
}) => {
  const fileType = getFileType(item.fileName);
  const isImage = fileType === "image";
  const isVideo = fileType === "video";
  const isGif = item.fileName?.toLowerCase().endsWith(".gif");

  const getDisplayUrl = () => {
    if (item.ipfsUrl)
      return item.ipfsUrl.replace(
        "ipfs.filebase.io",
        process.env.EXPO_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud",
      );
    if (item.cid)
      return `https://${
        process.env.EXPO_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud"
      }/ipfs/${item.cid}`;
    return null;
  };

  const displayUrl = getDisplayUrl();

  if (!displayUrl) {
    return (
      <View style={styles.noMedia}>
        <Text style={styles.noMediaText}>No media URL available</Text>
      </View>
    );
  }

  if (item.magnetLink && (isImage || isVideo)) {
    return (
      <View style={styles.magnetContainer}>
        <WebTorrentMedia
          media={{
            ...item,
            imageUrl: isImage ? displayUrl : null,
            videoUrl: isVideo ? displayUrl : null,
            fileType: fileType,
            isGif: isGif,
          }}
          isFocused={isFocused}
          isAlmostFocused={isAlmostFocused}
        />
      </View>
    );
  }

  if (isGif) {
    return (
      <TouchableOpacity
        style={styles.gifContainer}
        activeOpacity={1}
        onPress={() => console.log("GIF tapped:", displayUrl)}
      >
        <Image
          source={{ uri: displayUrl }}
          style={styles.image}
          contentFit="contain"
          transition={100}
          cachePolicy="memory-disk"
          recyclingKey={`gif-${item.id}`}
          onLoad={(e) => {
            const source = e.source;
            if (source && source.width && source.height) {
              onMediaAspectChange(source.width / source.height);
            }
          }}
        />
        <View style={styles.gifBadge}>
          <Text style={styles.gifBadgeText}>GIF</Text>
        </View>
        <Text style={styles.gifHint}>Tap and hold to save</Text>
      </TouchableOpacity>
    );
  }

  if (isImage) {
    return (
      <View style={styles.fixedMediaWrapper}>
        <Image
          source={{ uri: displayUrl }}
          style={styles.standardImage}
          contentFit="contain"
          transition={300}
          onLoad={(e) => {
            const source = e.source;
            if (source && source.width && source.height) {
              onMediaAspectChange(source.width / source.height);
            }
          }}
        />
      </View>
    );
  }

  if (isVideo) {
    return (
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={() => Linking.openURL(displayUrl)}
      >
        <View style={styles.videoThumbnail}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
        <Text style={styles.videoLabel}>Tap to play video</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(displayUrl)}
      style={styles.fileContainer}
    >
      <Text style={styles.fileIcon}>📁</Text>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.fileName || "File"}
        </Text>
        <Text style={styles.fileType}>
          {fileType || "File"} • Tap to download
        </Text>
      </View>
    </TouchableOpacity>
  );
};
*/

export default function AllNeighborhoodsGallery({
  neighborhoodId,
}: {
  neighborhoodId?: string;
}) {
  const { data, loading, error } = useQuery(GET_ALL_GALLERY, {
    fetchPolicy: "cache-and-network",
  });
  const { data: adData } = useQuery(GET_RANDOM_AFFILIATE_LINK);

  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);

  // Compute combined data
  const combinedData = React.useMemo(() => {
    if (!data?.getMyAllNeighborhoodsGallery) return [];
    const { videos, images } = data.getMyAllNeighborhoodsGallery;
    let flattened = [...(videos || []), ...(images || [])];

    if (neighborhoodId) {
      flattened = flattened.filter(
        (item) =>
          item.neighborhood?.id === neighborhoodId ||
          item.neighborhood === neighborhoodId,
      );
    }

  const normalized = flattened.map((item: any) => ({
    ...item,
 
    fileName: item.fileName || item.media?.[0]?.fileName || `media-${item.cid}`,
    fileType: item.media?.[0]?.mediaType === "video" ? "video" : "image",
  }));

    const raw = normalized.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const withAds: any[] = [];
    raw.forEach((item, index) => {
      withAds.push(item);
      if ((index + 1) % 5 === 0 && adData?.randomAffiliateLink) {
        withAds.push({
          isAd: true,
          id: `ad-page-${index}`,
          ...adData.randomAffiliateLink,
        });
      }
    });
    return withAds;
  }, [data, adData, neighborhoodId]);

  const mediaItems = combinedData;



  const handleNext = () => {
    setActiveIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : prev));
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  // Keyboard navigation for desktop web
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mediaItems.length]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF00FF" />
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>{error.message}</Text>
      </View>
    );

  if (mediaItems.length === 0)
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No media found</Text>
      </View>
    );

  const currentItem = mediaItems[activeIndex];

  // Touch handlers for mobile horizontal swipe
  const handleTouchStart = (e: any) => {
    setTouchStartX(e.nativeEvent.pageX);
  };

  const handleTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.pageX;
    const diff = touchStartX - touchEndX;

    if (diff > 50) {
      handleNext(); // Swipe left
    } else if (diff < -50) {
      handlePrev(); // Swipe right
    }
  };

  return (
    <View
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Media Viewport */}
      <View style={styles.viewport}>
        {currentItem.isAd ? (
          <View style={styles.adContainer}>
            <AdMessage ad={currentItem} />
          </View>
        ) : (
          <View style={styles.mediaWrapper}>
            <WebTorrentMedia
              key={currentItem.cid || currentItem.id || activeIndex}
              media={currentItem}
              isFocused={true}
              isAlmostFocused={false}
            />
          </View>
        )}
      </View>

      {/* Floating Counter Badge */}
      <View style={styles.counterOverlay}>
        <Text style={styles.counterText}>
          {activeIndex + 1} / {mediaItems.length}
        </Text>
      </View>

      {/* Left & Right Tap Buttons */}
      <View style={styles.buttonRow} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.navBtn, activeIndex === 0 && styles.disabledBtn]}
          onPress={handlePrev}
          disabled={activeIndex === 0}
        >
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navBtn,
            activeIndex === mediaItems.length - 1 && styles.disabledBtn,
          ]}
          onPress={handleNext}
          disabled={activeIndex === mediaItems.length - 1}
        >
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#130720",
    position: "relative",
  },
  viewport: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorTitle: { color: "#FF0000", fontSize: 18 },
  emptyTitle: { color: "#FFF", fontSize: 18 },
  adContainer: { padding: 20, justifyContent: "center", alignItems: "center" },

  counterOverlay: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    zIndex: 20,
  },
  counterText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },

  buttonRow: {
    position: "absolute",
    top: "50%",
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    transform: [{ translateY: -25 }],
    zIndex: 30,
  },
  navBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledBtn: { opacity: 0.2 },
  navBtnText: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: -2,
  },
});