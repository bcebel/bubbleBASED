import { useLocalSearchParams } from "expo-router";
import NeighborhoodLiveStreamPlayer from "../../components/NeighborhoodLiveStreamPlayer";

export default function BarebonesPlayer() {
  const { sessionId } = useLocalSearchParams();

  // This just renders the player, no tabs, no chat, no app UI.
  return <NeighborhoodLiveStreamPlayer sessionId={sessionId} />;
}
