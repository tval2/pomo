"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { callLLM, stopLLMAudio } from "../utils/llm";
import WebcamVideo from "./webcam";
import WebcamAudio from "./audio";
import TextFeed from "./textfeed";

export default function Pomo() {
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [responses, setResponses] = useState<{ id: number; text: string }[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [playAudio, setPlayAudio] = useState(false);
  const [sendPhotos, setSendPhotos] = useState(false);
  const [sendAudio, setSendAudio] = useState(false);
  const responseId = useRef(0);

  const addToQueue = (data: string, imageOrAudio: boolean) => {
    if (imageOrAudio) {
      setImageQueue((prevQueue) => [...prevQueue, data]);
    } else {
      setAudioQueue((prevQueue) => [...prevQueue, data]);
    }
  };

  const processQueue = useCallback(
    async (imageOrAudio: boolean) => {
      let queue = imageOrAudio ? imageQueue : audioQueue;
      if (queue.length === 0 || isProcessing) return;

      setIsProcessing(true);
      let data = queue[0];
      if (!sendPhotos && data.startsWith("data:image")) {
        data = "";
      }
      if (!sendAudio && data.startsWith("data:audio")) {
        data = "";
      }

      try {
        responseId.current = await callLLM(
          data,
          responseId.current,
          setResponses
        );
        if (imageOrAudio) {
          setImageQueue((prevQueue) => prevQueue.slice(1));
        } else {
          setAudioQueue((prevQueue) => prevQueue.slice(1));
        }
      } catch (error) {
        console.error("Error processing queue item:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [imageQueue, audioQueue, isProcessing, responseId]
  );

  useEffect(() => {
    processQueue(true);
  }, [imageQueue, processQueue]);

  useEffect(() => {
    processQueue(false);
  }, [audioQueue, processQueue]);

  const toggleAudio = () => {
    if (playAudio) {
      stopLLMAudio();
    }
    setPlayAudio(!playAudio);
  };

  const toggleSendPhotos = () => {
    setSendPhotos(!sendPhotos);
  };

  const toggleSendAudio = () => {
    setSendAudio(!sendAudio);
  };

  return (
    <div className="w-full h-full relative p-4">
      <WebcamVideo
        onNewData={(data: string) => {
          addToQueue(data, true);
        }}
        onClick={(data: string, x: number, y: number) => {
          // TODO: ask llm to identify the object at (x,y)
        }}
      />
      <WebcamAudio
        onNewData={(data: string) => {
          addToQueue(data, false);
        }}
      />
      <div>
        <button
          className={`px-4 py-2 rounded ${
            playAudio ? "bg-green-500" : "bg-red-500"
          } text-white`}
          onClick={toggleAudio}
        >
          {playAudio ? "TTS On" : "TTS Off"}
        </button>
        <button
          className={`px-4 py-2 rounded ${
            sendPhotos ? "bg-green-500" : "bg-red-500"
          } text-white`}
          onClick={toggleSendPhotos}
        >
          {sendPhotos ? "Sending images" : "Not sending images"}
        </button>
        <button
          className={`px-4 py-2 rounded ${
            sendAudio ? "bg-green-500" : "bg-red-500"
          } text-white`}
          onClick={toggleSendAudio}
        >
          {sendAudio ? "Sending audio" : "Not sending audio"}
        </button>
      </div>
      <TextFeed responses={responses} />
    </div>
  );
}
