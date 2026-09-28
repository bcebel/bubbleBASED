const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const magnetCache = new Map();

export async function getMagnetForCid(cid) {
  if (!cid) return null;
    if (magnetCache.has(cid)) return magnetCache.get(cid);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/media/${cid}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

  try {
    const res = await fetch(`${BACKEND_URL}/api/media/${cid}`);
    if (!res.ok) return null;
    const meta = await res.json();
    const magnet = meta.magnetLink || null;
    magnetCache.set(cid, magnet);
    return magnet;
  } catch (err) {
    console.warn("[magnet] lookup failed:", cid, err);
    return null;
  }
}
