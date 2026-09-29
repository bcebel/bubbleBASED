const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const magnetCache = new Map();

export async function getMagnetForCid(cid) {
  if (magnetCache.has(cid)) return magnetCache.get(cid);

  const res = await fetch(`https://bubblebased.com/api/media/${cid}`);
  if (!res.ok) return null;

  const meta = await res.json();
  const magnet = meta.magnetLink || null;
  magnetCache.set(cid, magnet);
  return magnet;
}