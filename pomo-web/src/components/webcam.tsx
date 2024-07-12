"use client";

import { useRef, useState, useEffect, useCallback } from "react";

import { InteractiveSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";
import cv from "@techstark/opencv-js";
import useRequestAnimationFrame from "use-request-animation-frame";

import { colorizeAndBlurMask } from "./shaders";

const SHOW_SCREENSHOT = false;
const SCREENSHOT_ON_CLICK = true;
const SCREENSHOT_CONTINUOUS = true;
const SCREENSHOT_INTERVAL = 4500;
const SHOW_CLICK_POS = true;

// Parameters for Lucas-Kanade optical flow
// Based on https://docs.opencv.org/4.5.1/db/d7f/tutorial_js_lucas_kanade.html
let videoCapture: any;
let frame: any;
let frameGray: any;
let oldGray: any;
let p0: any;
let p1: any;
let st: any;
let err: any;
let winSize: any;
let maxLevel = 2;
let criteria: any;

// Image Segmentation
let segmenter: InteractiveSegmenter;
let hasSegmented = false;
let clickPos: {
  x: number;
  y: number;
} | undefined;
let clickTime: number;

interface WebcamVideoProps {
  onNewData: (data: string) => void;
  onClick: (data: string, x: number, y: number) => void;
}

export default function WebcamVideo(props: WebcamVideoProps) {
  const [mediaStream, setMediaStream] = useState<MediaStream>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const clickPosRef = useRef<HTMLDivElement>(null);

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
    segmenter = interactiveSegmenter;
  };

  const onFrame = useCallback(() => {
    if (!segmenter || !videoRef.current || !clickPos) {
      return;
    }

    if (clickPosRef.current) {
      clickPosRef.current.style.left = `${videoRef.current.offsetLeft + clickPos.x}px`;
      clickPosRef.current.style.top = `${videoRef.current.offsetTop + clickPos.y}px`;
    }
    videoRef.current.width = videoRef.current.videoWidth;
    videoRef.current.height = videoRef.current.videoHeight;

    // Segment
    let segmentPos = clickPos;
    segmenter.segment(
      videoRef.current,
      {
        keypoint: {
          x: 1.0 - segmentPos.x / videoRef.current.videoWidth,
          y: segmentPos.y / videoRef.current.videoHeight,
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
        let clickPosNorm = { x: (1.0 - segmentPos.x / width), y: (1.0 - segmentPos.y / height) };

        colorizeAndBlurMask(ctx, width, height, maskData, dt, clickPosNorm);
      }
    );

    // Optical Flow
    if (!videoCapture) {
      frameGray = new cv.Mat();
      oldGray = new cv.Mat();
      p0 = new cv.Mat(1, 1, cv.CV_32FC2);
      p1 = new cv.Mat();
      st = new cv.Mat();
      err = new cv.Mat();
      winSize = new cv.Size(15, 15);
      criteria = new cv.TermCriteria(cv.TermCriteria_EPS | cv.TermCriteria_COUNT, 10, 0.03);

      videoCapture = new cv.VideoCapture(videoRef.current);
      frame = new cv.Mat(videoRef.current.videoHeight, videoRef.current.videoWidth, cv.CV_8UC4);
      videoCapture.read(frame);
      cv.cvtColor(frame, oldGray, cv.COLOR_RGB2GRAY);
    } else {
      // start processing.
      videoCapture.read(frame);
      cv.cvtColor(frame, frameGray, cv.COLOR_RGBA2GRAY);

      p0.data32F[0] = videoRef.current.videoWidth - clickPos.x;
      p0.data32F[1] = clickPos.y;

      // calculate optical flow
      cv.calcOpticalFlowPyrLK(oldGray, frameGray, p0, p1, st, err, winSize, maxLevel, criteria);

      // did we get a good point?
      if (st.rows === 1 && st.data[0] === 1) {
        clickPos = { x: videoRef.current.videoWidth - p1.data32F[0], y: p1.data32F[1] };
      } else {
        clickPos = undefined;
      }

      // update the previous frame
      frameGray.copyTo(oldGray);
    }
  }, []);

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
  }, [mediaStream]);

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
                clickPos = { x: x, y: y };
              }
              : undefined
          }
        />
        <canvas className={`absolute pointer-events-none ${clickPos ? "block" : "hidden"}`} ref={maskRef} />
        {clickPos && videoRef.current && SHOW_CLICK_POS ?
          <div
            className="absolute bg-red-500 w-[10px] h-[10px] translate-x-[-50%] translate-y-[-50%]"
            ref={clickPosRef}
          />
          : null
        }
      </div>
      <canvas
        className={"h-full mx-auto " + (SHOW_SCREENSHOT ? "block" : "hidden")}
        ref={canvasRef}
      />
    </div>
  );
}
