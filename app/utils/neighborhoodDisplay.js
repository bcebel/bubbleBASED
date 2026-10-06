export function getNeighborhoodDisplayName(neighborhood, currentUserId) {
  if (!neighborhood) return "";
  if (neighborhood.type === "personal") return "Personal";
  if (neighborhood.type === "private" && neighborhood.isDefault)
    return "My Bubble";
  if (neighborhood.type === "direct") {
    const other = neighborhood.members?.find(
      (m) => String(m.user?.id) !== String(currentUserId),
    );
    return other?.user?.username || "Direct Message";
  }
  return neighborhood.name;
}
