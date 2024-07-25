"use client";

import { useCallback, useState, useRef } from "react";
import { LLMData, callChat, callLLM, stopLLMAudio } from "../utils/llm";
import WebcamVideo from "./webcam";
import WebcamAudio from "./audio";
import TextFeed from "./textfeed";

interface Response {
  id: number;
  text: string;
}

const MAX_RECENT_IMAGES = 5;

export default function Pomo() {
  const [recentImages, setRecentImages] = useState<string[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [clickResponses, setClickResponses] = useState<Response[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClickProcessing, setIsClickProcessing] = useState(false);
  const [playAudio, setPlayAudio] = useState(false);
  const [sendPhotos, setSendPhotos] = useState(false);
  const [sendAudio, setSendAudio] = useState(false);
  const responseId = useRef(0);
  const clickResponseId = useRef(0);

  const processAudioWithImages = useCallback(
    async (audioData: string) => {
      if (isProcessing) return;

      setIsProcessing(true);
      let data: LLMData = {};

      if (sendAudio) {
        data.audio = audioData;
      }

      if (sendPhotos && recentImages.length > 0) {
        data.images = recentImages;
      }

      try {
        responseId.current = await callChat(
          data,
          responseId.current,
          setResponses
        );

        if (sendPhotos && recentImages.length > 0) {
          setRecentImages([]);
        }
      } catch (error) {
        console.error("Error processing audio with images:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, sendAudio, sendPhotos, recentImages]
  );

  const handleNewImage = useCallback((imageData: string) => {
    setRecentImages((prevImages) => [
      imageData,
      ...prevImages.slice(0, MAX_RECENT_IMAGES - 1),
    ]);
  }, []);

  const handleNewAudio = useCallback(
    (audioData: string) => {
      processAudioWithImages(audioData);
    },
    [processAudioWithImages]
  );

  const processClick = useCallback(
    async (image: string, coords: string) => {
      let data: LLMData = { images: [image], text: coords };

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
    },
    [isClickProcessing, clickResponseId]
  );

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
        onNewData={handleNewImage}
        onClick={(data: string, x: number, y: number) => {
          processClick(data, JSON.stringify({ x: x, y: y }));
        }}
      />
      <WebcamAudio onNewData={handleNewAudio} />
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
      {clickResponses.length > 0 ? (
        <p className="message mb-2 p-2">
          {"Responding as: " + clickResponses[clickResponses.length - 1].text}
        </p>
      ) : null}
      <TextFeed responses={responses} />
    </div>
  );
}
