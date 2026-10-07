import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, gql } from "@apollo/client";
import { View, ActivityIndicator, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import FeedItem from "../../../components/FeedItem";
const router = useRouter();

const GET_POST = gql`
  query GetPost($id: ID!) {
    post(id: $id) {
      id
      content
      author {
        id
        username
        profilePhoto
      }
      media {
        cid
        magnetURI
        mediaType
        fileName
        mimeType
      }
      neighborhood {
        id
        name
      }
      createdAt
    }
  }
`;

export default function SinglePost() {
    const { id, from } = useLocalSearchParams();
    
    const handleBack = () => {
      if (from) {
        router.replace(from);
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/gallery"); // or wherever
      }
    };

  const { data, loading, error } = useQuery(GET_POST, {
    variables: { id },
    skip: !id,
  });

  if (loading) return <ActivityIndicator size="large" />;
  if (error) return <Text>Error: {error.message}</Text>;
  if (!data?.post) return <Text>Post not found</Text>;

  return (
    <ScrollView>
      <TouchableOpacity onPress={() => handleBack()}>
              <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <FeedItem post={data.post} onDelete={() => router.back()} />
    </ScrollView>
  );
}


const styles = StyleSheet.create({
    
        back: {color: "#ffff"       
    },
})
