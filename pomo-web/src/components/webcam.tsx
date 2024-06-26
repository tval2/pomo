"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const SHOW_SCREENSHOT = false;
const SCREENSHOT_ON_CLICK = true;
const SCREENSHOT_CONTINUOUS = true;
const SCREENSHOT_INTERVAL = 2000;

export default function WebcamVideo() {
  const [queue, setQueue] = useState<string[]>([]);
  const [responses, setResponses] = useState<{ id: number; text: string }[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let responseId = 0;

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

  const addToQueue = (imageData: string) => {
    setQueue((prevQueue) => [...prevQueue, imageData]);
  };

  const callLLM = async (imageData: string) => {
    if (!imageData) {
      console.error("No image data to send to callLLM");
      return;
    }

    try {
      const response = await fetch("/api/chat", {
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

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        accumulatedResponse += chunk;

        setResponses((prevResponses) => {
          const lastResponse = prevResponses[prevResponses.length - 1];
          if (lastResponse && lastResponse.id === responseId) {
            return [
              ...prevResponses.slice(0, -1),
              { ...lastResponse, text: lastResponse.text + chunk },
            ];
          } else {
            return [
              ...prevResponses,
              { id: responseId, text: accumulatedResponse },
            ];
          }
        });
      }

      responseId++;
    } catch (error) {
      console.error("Error calling chat API:", error);
    }
  };

  const processQueue = useCallback(async () => {
    if (queue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const imageData = queue[0];

    try {
      await callLLM(imageData);
      setQueue((prevQueue) => prevQueue.slice(1));
    } catch (error) {
      console.error("Error processing queue item:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [queue, isProcessing]);

  useEffect(() => {
    processQueue();
  }, [queue, processQueue]);

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
          addToQueue(img);
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
      <div>
        <h3>LLM Responses:</h3>
        {responses.map((response) => (
          <p key={response.id} className="message">
            {response.text}
          </p>
        ))}
      </div>
      <style jsx>{`
        .message {
          white-space: pre-wrap;
          margin-bottom: 2em;
          padding: 0.5em;
        }
      `}</style>
    </div>
  );
}
