"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const SHOW_SCREENSHOT = false;
const SCREENSHOT_ON_CLICK = true;
const SCREENSHOT_CONTINUOUS = true;
const SCREENSHOT_INTERVAL = 5000;

export default function WebcamVideo() {
  const [mediaStream, setMediaStream] = useState<MediaStream>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const takeScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    let canvasContext = canvas.getContext("2d")!;
    canvasContext.drawImage(video, 0, 0);
    return canvas.toDataURL("image/png");
  }, [canvasRef]);

  const setupMediaStream = useCallback(async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setMediaStream(ms);
    } catch (e) {
      alert("Camera is disabled");
      throw e;
    }
  }, []);

  const callLLM = async (imageData: string) => {
    if (!imageData) {
      console.error("No image data to send to callLLM");
      return;
    }

    try {
      const response = await fetch("/api/llm", {
        method: "POST",
        body: JSON.stringify({ imageData }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, details: ${errorText}`
        );
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error("Error calling LLM API:", error);
    }
  };

  useEffect(() => {
    async function setupWebcamVideo() {
      if (!mediaStream) {
        await setupMediaStream();
      } else {
        const videoCurr = videoRef.current;
        if (!videoCurr) {
          return;
        }

        const video = videoCurr;
        if (!video.srcObject) {
          video.srcObject = mediaStream;
        }
      }
    }
    setupWebcamVideo();

    let intervalId: NodeJS.Timeout | null = null;

    if (SCREENSHOT_CONTINUOUS) {
      intervalId = setInterval(async () => {
        const img = takeScreenshot();
        if (img) {
          console.log("Continuous Image taken");
          try {
            const response = await callLLM(img);
            console.log("LLM Response:", response);
          } catch (error) {
            console.error("Error processing screenshot:", error);
          }
        } else {
          console.log("Failed to take cont. screenshot");
        }
      }, SCREENSHOT_INTERVAL);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [mediaStream]);

  return (
    <div className="w-full h-full relative">
      <video
        className="h-full mx-auto"
        ref={videoRef}
        disablePictureInPicture
        autoPlay
        muted
        onClick={
          SCREENSHOT_ON_CLICK
            ? (event) => {
                let rect = videoRef.current!.getBoundingClientRect();
                console.log(
                  "Clicked at (" +
                    (event.pageX - rect.left) +
                    ", " +
                    (event.clientY - rect.top) +
                    ")"
                );
                console.log("Image: " + takeScreenshot());
              }
            : undefined
        }
      />
      <canvas
        className={"h-full mx-auto " + (SHOW_SCREENSHOT ? "block" : "hidden")}
        ref={canvasRef}
      />
    </div>
  );
}
