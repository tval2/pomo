"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { callLLM } from "../utils/llm";
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
      const data = queue[0];

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

  return (
    <div className="w-full h-full relative">
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
      <TextFeed responses={responses} />
    </div>
  );
}
