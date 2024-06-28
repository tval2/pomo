"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { callLLM } from "../utils/llm";
import WebcamVideo from "./webcam";
import WebcamAudio from "./audio";

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
      <div>
        <h3>LLM Responses:</h3>
        <div className="overflow-y-auto max-h-64 flex flex-col-reverse">
          {responses
            .filter((el) => {
              return el.text.trim() !== "$null$";
            })
            .toReversed()
            .map((response) => (
              <p key={response.id} className="message">
                {response.text}
              </p>
            ))}
        </div>
      </div>
      <style jsx>{`
        .message {
          white-space: pre-wrap;
          margin-bottom: 0.5em;
          padding: 0.5em;
        }
      `}</style>
    </div>
  );
}
