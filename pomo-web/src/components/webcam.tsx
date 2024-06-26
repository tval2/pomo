"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const SHOW_SCREENSHOT = false;
const SCREENSHOT_ON_CLICK = true;
const SCREENSHOT_CONTINUOUS = true;
const SCREENSHOT_INTERVAL = 2000;
const SHOW_AUDIO = false;

export default function WebcamVideo() {
  const [queue, setQueue] = useState<string[]>([]);
  const [responses, setResponses] = useState<{ id: number; text: string }[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream>();
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder>();
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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
      // Video Stream
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setMediaStream(ms);

      // Audio Stream
      const as = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      const recorder = new MediaRecorder(as, { mimeType: "audio/ogg" });
      recorder.ondataavailable = (e) => {
        setAudioChunks((audioChunks) => [...audioChunks, e.data]);
      };
      setAudioRecorder(recorder);
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

  const toggleRecording = () => {
    if (!audioRecorder) {
      return;
    }

    if (!isRecording) {
      setAudioChunks([]);
      audioRecorder.start(100); // how many ms per audio chunk
    } else {
      audioRecorder.stop();

      var reader = new FileReader();
      reader.onload = function(e) {
        let audioURL = e.target?.result;
        console.log("New audio blob" + audioURL);
        let audio = audioRef.current;
        if (!audio || !audioURL) {
          return;
        }

        audio.src = (audioURL as string);
      }
      reader.readAsDataURL(new Blob(audioChunks, { type: audioRecorder.mimeType }));
    }
    setIsRecording(!isRecording);
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
      <div className="w-fit h-full mx-auto relative">
        <video
          ref={videoRef}
          disablePictureInPicture
          autoPlay
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
        <button
          className="absolute bottom-0 right-0 bg-white text-black p-2"
          onClick={toggleRecording}
        >
          {isRecording ? "Stop" : "Record"}
        </button>
      </div>
      <canvas
        className={"h-full mx-auto " + (SHOW_SCREENSHOT ? "block" : "hidden")}
        ref={canvasRef}
      />
      <audio
        className={"h-full mx-auto " + (SHOW_AUDIO ? "block" : "hidden")}
        ref={audioRef}
        controls
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
