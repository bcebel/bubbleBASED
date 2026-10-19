// utils/webtorrentService.js
class WebTorrentService {
  async ensureClient() {
    throw new Error("WebTorrent is not supported on the server.");
  }
  async seed() {
    return null;
  }
  async add() {
    return null;
  }
  async destroyCleanup() {}
  cleanup() {}
}
const webtorrentService = new WebTorrentService();
export default webtorrentService;
