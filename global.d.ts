declare global {
  interface Window {
    WebTorrent?: any;
    globalWebTorrentClient?: any;
    enhancedTrackers?: string[];
  }
}

export {};
