"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const SHOW_SCREENSHOT = false;
const SCREENSHOT_ON_CLICK = true;
const SCREENSHOT_CONTINUOUS = true;
const SCREENSHOT_INTERVAL = 2000;

interface WebcamVideoProps {
  onNewData: (data: string) => void,
  onClick: (data: string, x: number, y: number) => void
};

export default function WebcamVideo(props: WebcamVideoProps) {
  const [mediaStream, setMediaStream] = useState<MediaStream>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const takeScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
      return undefined;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    let canvasContext = canvas.getContext("2d")!;
    canvasContext.scale(-1, 1);
    canvasContext.drawImage(video, 0, 0, -canvas.width, canvas.height);
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
          // console.log("Continuous Image taken " + img);
          props.onNewData(img);
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
      <video className="w-fit h-full mx-auto relative scale-x-[-1]"
        ref={videoRef}
        disablePictureInPicture
        autoPlay
        onClick={
          SCREENSHOT_ON_CLICK
            ? (event) => {
                let img = takeScreenshot();
                if (img) {
                  let rect = videoRef.current!.getBoundingClientRect();
                  props.onClick(img, (event.pageX - rect.left), (event.clientY - rect.top));
                }
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
