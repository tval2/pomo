"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { LLMData, callChat, callLLM, setAudioEnabled } from "../utils/llm";
import WebcamVideo from "./webcam";
import WebcamAudio from "./audio";
import TextFeed from "./textfeed";

interface Response {
  id: number;
  text: string;
}

const MAX_RECENT_IMAGES = 1;
const DEFAULT_SEND_PHOTOS = true;
const DEFAULT_SEND_AUDIO = true;
const DEFAULT_PLAY_AUDIO = true;

export default function Pomo() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [clickResponses, setClickResponses] = useState<Response[]>([]);
  const [isClickProcessing, setIsClickProcessing] = useState(false);
  const [playAudio, setPlayAudio] = useState(DEFAULT_PLAY_AUDIO);
  const [sendPhotos, setSendPhotos] = useState(DEFAULT_SEND_PHOTOS);
  const [sendAudio, setSendAudio] = useState(DEFAULT_SEND_AUDIO);

  const responseId = useRef(0);
  const clickResponseId = useRef(0);
  const isProcessingRef = useRef(false);
  const playAudioRef = useRef(DEFAULT_PLAY_AUDIO);
  const sendPhotosRef = useRef(DEFAULT_SEND_PHOTOS);
  const sendAudioRef = useRef(DEFAULT_SEND_AUDIO);
  const recentImagesRef = useRef<string[]>([]);

  useEffect(() => {
    sendPhotosRef.current = sendPhotos;
  }, [sendPhotos]);

  useEffect(() => {
    sendAudioRef.current = sendAudio;
  }, [sendAudio]);

  useEffect(() => {
    playAudioRef.current = playAudio;
  }, [playAudio]);

  const processAudioWithImages = useCallback(
    async (audioData: string) => {
      if (isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;

      const data: LLMData = {};

      if (sendAudioRef.current) {
        data.audio = audioData;
      }

      if (sendPhotosRef.current && recentImagesRef.current.length > 0) {
        data.images = recentImagesRef.current;
      }

      try {
        responseId.current = await callChat(
          data,
          responseId.current,
          setResponses,
          playAudio
        );

        if (sendPhotosRef.current && recentImagesRef.current.length > 0) {
          recentImagesRef.current = [];
        }
      } catch (error) {
        console.error("Error processing audio with images:", error);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [playAudio]
  );

  const handleNewImage = useCallback((imageData: string) => {
    recentImagesRef.current = [
      imageData,
      ...recentImagesRef.current.slice(0, MAX_RECENT_IMAGES - 1),
    ];
  }, []);

  const handleNewAudio = useCallback(
    (audioData: string) => {
      processAudioWithImages(audioData);
    },
    [processAudioWithImages]
  );

  const processClick = useCallback(async (image: string, coords: string) => {
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
  }, []);

  const toggleAudioOutput = useCallback(() => {
    playAudioRef.current = !playAudioRef.current;
    setPlayAudio(playAudioRef.current);
    setAudioEnabled(playAudioRef.current);
  }, []);

  const toggleSendPhotos = useCallback(() => {
    setSendPhotos((prev) => !prev);
  }, []);

  const toggleSendAudio = useCallback(() => {
    setSendAudio((prev) => !prev);
  }, []);

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
          onClick={toggleAudioOutput}
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
      {clickResponses.length > 0 && (
        <p className="message mb-2 p-2">
          {"Responding as: " + clickResponses[clickResponses.length - 1].text}
        </p>
      )}
      <TextFeed responses={responses} />
    </div>
  );
}
