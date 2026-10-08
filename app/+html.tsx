import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";
import VerificationText from "../components/verification";

export default function Root({ children }: PropsWithChildren) {
  const title = "ebubbl 🫧";
  const description =
    "Join ebubbl.com 🫧 a private social network where you control your privacy, earn from your content, and connect in digital neighborhoods. Bubbly & based.";
  const url = "https://ebubbl.com";
  const image = "https://ebubbl.com/bble.png";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>ebubbl.com</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="canonical" href="https://ebubbl.com/" />
        <link rel="preload" as="image" href="/bbl.webp" fetchPriority="high" />
        <script dangerouslySetInnerHTML={{ __html: sw }} />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
      html, body, #root {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        overscroll-behavior: none;
          cursor: url('./16.png')8 8, auto;
      }
      body {
        background-color: #130720;
      }
      #root {
        display: flex;
        flex-direction: column;
      }
    `,
          }}
        />
        <meta name="description" content={description} />
        <meta
          name="keywords"
          content="social network, privacy, digital neighborhoods, affiliate marketing, community, ebubbl, 🫧, webtorrent, p2p, social media, privacy, context"
        />
        <meta name="author" content="ebubbl" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content="ebubbl" />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta
          property="og:image:secure_url"
          content="https://ebubbl.com/bbl-og.jpg"
        />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:site_name" content="ebubbl" />
        <meta property="og:locale" content="en_US" />
        <meta
          name="root.txt"
          content="lvnAxw0UhYgjF3kq4GKccyigEEVkHXkKTHntmIXRGvJ9aIHkiVw4Kg=="
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@ebubbl_" />
        <meta name="twitter:creator" content="@ebubbl_" />
        <meta name="twitter:title" content="ebubbl" />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://ebubbl.com/bbl-og.jpg" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "ebubbl",
              description: description,
              url: url,
              applicationCategory: "SocialNetworkApplication",
              operatingSystem: "Web Browser, iOS, Android",
              permissions: "browser",
              author: {
                "@type": "Organization",
                name: "ebubbl",
                url: url,
              },
              featureList: [
                "Private and Public Bubbles 🫧",
                "Digital neighborhoods",
                "Privacy control",
                "Affiliate link integration",
                "Community revenue sharing",
              ],
            }),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "ebubbl",
              url: url,
              logo: "https://ebubbl.com/logo.png",
              description: description,
              sameAs: [
                "https://twitter.com/ebubbl_",
                "https://instagram.com/ebubbl",
              ],
              address: {
                "@type": "PostalAddress",
                addressLocality: "Internet",
                addressCountry: "US",
              },
            }),
          }}
        />

        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="preconnect"
          href="https://minnowspacebackend-e6635e46c3d0.herokuapp.com"
        />
        <link rel="icon" href="/48.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/180.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/16.png" />

        <meta name="theme-color" content="#20B2AA" />
        <meta name="msapplication-TileColor" content="#20B2AA" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="canonical" href={url} />
        <meta
          name="impact-site-verification"
          content="6430b649-d08d-495d-8ef7-5f05702bf594"
        />
        <link rel="preload" as="image" href="/bble.png" />
      </head>

      <body>
        <div
          id="splash-screen"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between", // ← top/bottom anchoring
            backgroundColor: "#FFFFFF",
            color: "#0A0C10",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            textAlign: "center",
            padding: "40px 20px",
            boxSizing: "border-box",
            zIndex: 99999,
          }}
        >
          {/* Top: heading */}
          <h1
            style={{
              fontSize: "2rem",
              color: "#FF0081",
              margin: 0,
            }}
          >
            digital bubbles 🫧 for everyone
          </h1>

          {/* Middle: image */}
          <img
            src="/ebubbl.webp"
            alt=""
            style={{
              maxWidth: "80%",
              maxHeight: "50vh",
              objectFit: "contain",
            }}
            fetchPriority="high"
          />

          {/* Bottom: nav */}
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: "center",
              marginTop: "1.5rem",
              maxWidth: "600px",
            }}
          >
            {[
              { label: "Login", href: "/login" },
              { label: "Register", href: "/register" },
              { label: "Global", href: "/bubbles/global" },
              { label: "Gallery", href: "/gallery" },
              { label: "Livestream", href: "/livestream" },
              { label: "Inbox", href: "/inbox" },
              { label: "Setup", href: "/setup" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "0.9rem",
                  color: "#0A0C10",
                  textDecoration: "none",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "#FFC800",
                  borderStyle: "solid",
                  borderWidth: "1px",
                  backdropFilter: "blur(5px)",
                  transition: "all 0.2s ease",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div id="root">{children}</div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
      // No auto-hide. The app controls this.
      window.__hideSplash = () => {
        const splash = document.getElementById("splash-screen");
        if (!splash) return;
        splash.style.opacity = "0";
        setTimeout(() => { splash.style.display = "none"; }, 200);
      };
    `,
          }}
        />
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
      import WebTorrent from '/webtorrent.min.js';
      window.WebTorrent = WebTorrent;

      window.enhancedTrackers = [
        "wss://tracker-0ad4cca9fd92.herokuapp.com",
        "wss://tracker.files.fm:7073/announce",
        "wss://tracker.webtorrent.dev",
        "wss://tracker.openwebtorrent.com",
        "wss://tracker.files.fm:7073",
        "udp://tracker.opentrackr.org:1337/announce",
        "udp://open.tracker.cl:1337/announce",
        "udp://9.rarbg.to:2710/announce",
        "udp://tracker.coppersurfer.tk:6969/announce",
        "udp://tracker.leechers-paradise.org:6969/announce",
        "udp://tracker.internetwarriors.net:1337/announce",
        "udp://exodus.desync.com:6969/announce",
        "udp://tracker.moeking.me:6969/announce",
        "udp://opentor.org:2710/announce",
        "udp://tracker.cyberia.is:6969/announce",
        "udp://tracker3.itzmx.com:6961/announce"
      ];

      function runWebTorrentServer(targetController) {
        if (window.WebTorrent && !window.globalWebTorrentClient) {
          window.globalWebTorrentClient = new window.WebTorrent({
            tracker: {
              announce: window.enhancedTrackers,
              rtcConfig: {
                iceServers: [
                  { urls: "stun:stun.relay.metered.ca:80" },
                  { urls: "turn:standard.relay.metered.ca:80", username: "fe67734f65cabae0c1f0bf61", credential: "AY3FDMwL9QjEIZ2R" },
                  { urls: "turn:standard.relay.metered.ca:80?transport=tcp", username: "fe67734f65cabae0c1f0bf61", credential: "AY3FDMwL9QjEIZ2R" },
                  { urls: "turn:standard.relay.metered.ca:443", username: "fe67734f65cabae0c1f0bf61", credential: "AY3FDMwL9QjEIZ2R" },
                  { urls: "turns:standard.relay.metered.ca:443?transport=tcp", username: "fe67734f65cabae0c1f0bf61", credential: "AY3FDMwL9QjEIZ2R" },
                  { urls: "stun:stun.l.google.com:19302" },
                  { urls: "stun:stun1.l.google.com:19302" },
                  { urls: "stun:global.stun.twilio.com:3478" }
                ],
              },
            },
            webSeeds: true,
          });

          window.globalWebTorrentClient.createServer({
            controller: targetController
          });
          window.__canStream = true;
          console.log("🌪️ CHAMP INITIALIZED WITH UNIFIED CONTROL ROUTE");
        }
      }

      try {
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            if (navigator.serviceWorker.controller) {
              console.log("🎬 Service worker already controlling page. Re-attaching server channel.");
              runWebTorrentServer(navigator.serviceWorker.controller);
            } else {
              navigator.serviceWorker
                .register("/sw.js", { scope: "/" })
                .then((registration) => navigator.serviceWorker.ready.then(() => registration))
                .then((registration) => {
                  runWebTorrentServer(navigator.serviceWorker.controller || registration.active);
                  setTimeout(() => {
                    console.log("server:", !!window.globalWebTorrentClient?._server);
                    console.log("SW controller:", navigator.serviceWorker.controller);
                  }, 3000);
                })
                .catch((e) => {
                  console.error("🎬 Service worker compilation fallback error:", e);
                  window.__canStream = false;
                });
            }
          });
        }
      } catch (e) {
        console.error("🌪️ CHAMP BLOCK CRASHED:", e);
      }
    `,
          }}
        />
      </body>
    </html>
  );
}

const sw = `
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    });
}
`;
