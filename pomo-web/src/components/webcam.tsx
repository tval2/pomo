"use client";

import { useRef, useState, useEffect, useCallback } from "react";

import { InteractiveSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

import useRequestAnimationFrame from "use-request-animation-frame";

import { colorizeAndBlurMask } from "./shaders";

const SHOW_SCREENSHOT = false;
const SCREENSHOT_ON_CLICK = true;
const SCREENSHOT_CONTINUOUS = true;
const SCREENSHOT_INTERVAL = 2000;

let hasSegmented = false;
let clickTime: number;

interface WebcamVideoProps {
  onNewData: (data: string) => void;
  onClick: (data: string, x: number, y: number) => void;
}

export default function WebcamVideo(props: WebcamVideoProps) {
  const [mediaStream, setMediaStream] = useState<MediaStream>();
  const [segmenter, setSegmenter] = useState<InteractiveSegmenter>();
  const [clickPos, setClickPos] = useState<{
    x: number;
    y: number;
  }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);

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

  const createSegmenter = async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    let interactiveSegmenter = await InteractiveSegmenter.createFromOptions(
      filesetResolver,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite",
          delegate: "GPU",
        },
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      }
    );
    setSegmenter(interactiveSegmenter);
  };

  const onFrame = useCallback(() => {
    if (!segmenter || !videoRef.current || !clickPos) {
      return;
    }

    segmenter.segment(
      videoRef.current,
      {
        keypoint: {
          x: 1.0 - clickPos.x / videoRef.current.videoWidth,
          y: clickPos.y / videoRef.current.videoHeight,
        },
      },
      (result) => {
        // The model takes a few seconds to initialize the first time
        // When we get our first successful result, treat that as the clickTime
        // so we don't see a flash
        if (!hasSegmented) {
          clickTime = new Date().getTime() / 1000;
          hasSegmented = true;
        }

        const mask = result.confidenceMasks![0]!;
        const canvas = maskRef.current;
        if (!mask || !canvas) {
          return;
        }

        const width = mask.width;
        const height = mask.height;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("webgl2")!;

        const maskData = mask.getAsUint8Array();
        let dt = new Date().getTime() / 1000 - clickTime;
        let clickPosNorm = { x: (1.0 - clickPos.x / width), y: (1.0 - clickPos.y / height) };

        colorizeAndBlurMask(ctx, width, height, maskData, dt, clickPosNorm);
      }
    );
  }, [segmenter, videoRef, clickPos]);

  useRequestAnimationFrame(onFrame, {
    shouldAnimate:
      segmenter !== undefined &&
      videoRef.current !== undefined &&
      clickPos !== undefined,
  });

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

    async function setupSegmenter() {
      if (!segmenter) {
        await createSegmenter();
      }
    }
    setupSegmenter();

    let intervalId: NodeJS.Timeout | null = null;
    if (SCREENSHOT_CONTINUOUS) {
      intervalId = setInterval(async () => {
        const img = takeScreenshot();
        if (img) {
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
  }, [mediaStream, segmenter]);

  return (
    <div className="w-full h-full relative">
      <div className="flex justify-center">
        <video
          className="w-fit h-full relative scale-x-[-1]"
          ref={videoRef}
          disablePictureInPicture
          autoPlay
          onClick={
            SCREENSHOT_ON_CLICK
              ? (event) => {
                let rect = videoRef.current!.getBoundingClientRect();
                let x = event.pageX - rect.left;
                let y = event.clientY - rect.top;

                let img = takeScreenshot();
                if (img) {
                  props.onClick(img, x, y);
                }

                clickTime = new Date().getTime() / 1000;
                setClickPos((clickPos) => {
                  if (!clickPos) {
                    return { x: x, y: y };
                  } else {
                    clickPos.x = x;
                    clickPos.y = y;
                    return clickPos;
                  }
                });
              }
              : undefined
          }
        />
        <canvas className="absolute pointer-events-none" ref={maskRef} />
      </div>
      <canvas
        className={"h-full mx-auto " + (SHOW_SCREENSHOT ? "block" : "hidden")}
        ref={canvasRef}
      />
    </div>
  );
}
