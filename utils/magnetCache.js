// magnetCache.js
let magnetCache;
try {
  magnetCache = new Map(
    JSON.parse(localStorage.getItem("magnetCache") || "[]"),
  );
} catch (_) {
  magnetCache = new Map();
}

export async function getMagnetForCid(cid) {
  if (magnetCache.has(cid)) return magnetCache.get(cid);

  const res = await fetch(`https://bubblebased.com/api/media/${cid}`);
  if (!res.ok) return null;

  const meta = await res.json();
  const magnet = meta.magnetLink || null;
  magnetCache.set(cid, magnet);

  try {
    localStorage.setItem("magnetCache", JSON.stringify([...magnetCache]));
  } catch (_) {
    // storage full or blocked — skip persistence, cache still works in-memory
  }
  return magnet;
}
