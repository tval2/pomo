"use client";

import { useCallback, useEffect, useState } from "react";
import WebcamVideo from "./webcam";
import WebcamAudio from "./audio";

let responseId = 0;
export default function Pomo() {
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [responses, setResponses] = useState<{ id: number; text: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addToQueue = (data: string, imageOrAudio: boolean) => {
    if (imageOrAudio) {
      setImageQueue((prevQueue) => [...prevQueue, data]);
    } else {
      setAudioQueue((prevQueue) => [...prevQueue, data]);
    }
  };

  const callLLM = async (data: string) => {
    if (!data) {
      console.error("No data to send to callLLM");
      return;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ data }),
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

  const processQueue = useCallback(async (imageOrAudio: boolean) => {
    let queue = imageOrAudio ? imageQueue : audioQueue;
    if (queue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const data = queue[0];

    try {
      await callLLM(data);
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
  }, [imageQueue, audioQueue, isProcessing]);

  useEffect(() => {
    processQueue(true);
  }, [imageQueue, processQueue]);

  useEffect(() => {
    processQueue(false);
  }, [audioQueue, processQueue]);

  return (
    <div className="w-full h-full relative">
      <WebcamVideo
        onNewData={(data: string) => { addToQueue(data, true) }}
        onClick={(data: string, x: number, y: number) => {
          // TODO: ask llm to identify the object at (x,y)
        }}
      />
      <WebcamAudio
        onNewData={(data: string) => { addToQueue(data, false) }}
      />
      <div>
        <h3>LLM Responses:</h3>
        <div className="overflow-y-auto max-h-64 flex flex-col-reverse">
          {responses.filter((el) => { return el.text.trim() !== "$null$" }).toReversed().map((response) => (
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
