"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { LLMData, callChat, callLLM, stopLLMAudio } from "../utils/llm";
import WebcamVideo from "./webcam";
import WebcamAudio from "./audio";
import TextFeed from "./textfeed";

enum DataType {
  IMAGE = 0,
  AUDIO,
};

export default function Pomo() {
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [responses, setResponses] = useState<{ id: number; text: string }[]>(
    []
  );
  const [clickResponses, setClickResponses] = useState<{ id: number; text: string }[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClickProcessing, setIsClickProcessing] = useState(false);
  const [playAudio, setPlayAudio] = useState(false);
  const [sendPhotos, setSendPhotos] = useState(false);
  const [sendAudio, setSendAudio] = useState(false);
  const responseId = useRef(0);
  const clickResponseId = useRef(0);

  const addToQueue = (data: string, dataType: DataType) => {
    switch (dataType) {
      case DataType.IMAGE:
        setImageQueue((prevQueue) => [...prevQueue, data]);
        break;
      case DataType.AUDIO:
        setAudioQueue((prevQueue) => [...prevQueue, data]);
        break;
    }
  };

  const processQueue = useCallback(async () => {
    if (imageQueue.length === 0 || audioQueue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    let data: LLMData = {};
    if (sendPhotos && imageQueue[0].startsWith("data:image")) {
      data.image = imageQueue[0];
    }
    if (sendAudio && audioQueue[0].startsWith("data:audio")) {
      data.audio = audioQueue[0];
    }

    try {
      responseId.current = await callChat(
        data,
        responseId.current,
        setResponses
      );
      setImageQueue((prevQueue) => prevQueue.slice(1));
      setAudioQueue((prevQueue) => prevQueue.slice(1));
    } catch (error) {
      console.error("Error processing queue item:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageQueue, audioQueue, isProcessing, responseId]);

  const processClick = useCallback(async (image: string, coords: string) => {
    let data: LLMData = { image: image, text: coords };

    setIsClickProcessing(true);
    try {
      clickResponseId.current = await callLLM(
        data,
        clickResponseId.current,
        setClickResponses
      );
    } catch (error) {
      console.error("Error processing click:", error);
    } finally {
      setIsClickProcessing(false);
    }
  }, [isClickProcessing, clickResponseId]);

  useEffect(() => {
    processQueue();
  }, [imageQueue, audioQueue, processQueue]);

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
          addToQueue(data, DataType.IMAGE);
        }}
        onClick={(data: string, x: number, y: number) => {
          processClick(data, JSON.stringify({ x: x, y: y }));
        }}
      />
      <WebcamAudio
        onNewData={(data: string) => {
          addToQueue(data, DataType.AUDIO);
        }}
      />
      <div>
        <button
          className={`px-4 py-2 rounded ${playAudio ? "bg-green-500" : "bg-red-500"
            } text-white`}
          onClick={toggleAudio}
        >
          {playAudio ? "TTS On" : "TTS Off"}
        </button>
        <button
          className={`px-4 py-2 rounded ${sendPhotos ? "bg-green-500" : "bg-red-500"
            } text-white`}
          onClick={toggleSendPhotos}
        >
          {sendPhotos ? "Sending images" : "Not sending images"}
        </button>
        <button
          className={`px-4 py-2 rounded ${sendAudio ? "bg-green-500" : "bg-red-500"
            } text-white`}
          onClick={toggleSendAudio}
        >
          {sendAudio ? "Sending audio" : "Not sending audio"}
        </button>
      </div>
      {clickResponses.length > 0 ?
        <p className="message mb-2 p-2">
          {"Responding as: " + clickResponses[clickResponses.length - 1].text}
        </p>
        : null
      }
      <TextFeed responses={responses} />
    </div>
  );
}
