// utils/webtorrentService.js
class WebTorrentService {
  constructor() {
    this.trackers = [];
  }

  async ensureClient() {
    // On the server, we don't have WebTorrent.
    // In Expo Go, we fall back to the global if it exists.
    if (typeof window !== "undefined" && window.globalWebTorrentClient) {
      return window.globalWebTorrentClient;
    }
    throw new Error("WebTorrent is not supported in this environment.");
  }

  // Stub out the other methods so the app doesn't crash if they are called
  async seed() {
    return null;
  }
  async add() {
    return null;
  }
  async destroyCleanup() {}
  cleanup() {}
  cleanupWithData() {}
  async prewarmMagnet() {
    return null;
  }
  getCachedMagnets() {
    return [];
  }
  clearExpiredCache() {}
}

const webtorrentService = new WebTorrentService();
export default webtorrentService;
