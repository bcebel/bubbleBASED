import React, { useEffect } from "react";

export default function NativeRecorderPage() {
  useEffect(() => {
    // We put the recording logic here
    let mediaRecorder: any;
    let chunkIndex = 0;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: 30 },
          audio: true,
        });

        const video = document.getElementById("preview") as HTMLVideoElement;
        if (video) video.srcObject = stream;

        const mimeType = MediaRecorder.isTypeSupported(
          "video/webm;codecs=vp8,opus",
        )
          ? "video/webm;codecs=vp8,opus"
          : "video/mp4";

        mediaRecorder = new MediaRecorder(stream, { mimeType });

        mediaRecorder.ondataavailable = (e: any) => {
          if (e.data.size > 0) {
            const reader = new FileReader();
            reader.readAsDataURL(e.data);
            reader.onloadend = () => {
              const base64data = (reader.result as string).split(",")[1];
              const index = chunkIndex === 0 ? -1 : chunkIndex - 1;

              // @ts-ignore
              if (window.ReactNativeWebView) {
                // @ts-ignore
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({
                    type: "CHUNK",
                    index: index,
                    base64: base64data,
                    mimeType: mimeType,
                  }),
                );
              }
              chunkIndex++;
            };
          }
        };

        mediaRecorder.start(4000);
      } catch (err) {
        console.error(err);
      }
    }

    // Listen for messages from React Native
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "start") start();
      if (event.data === "stop" && mediaRecorder) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach((t: any) => t.stop());
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage); // For Android

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div
      style={{ margin: 0, padding: 0, background: "black", height: "100vh" }}
    >
      <video
        id="preview"
        autoPlay
        playsInline
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}
