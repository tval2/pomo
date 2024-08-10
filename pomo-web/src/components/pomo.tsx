"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { LLMData, callChat } from "@/utils/llm";
import { setAudioEnabled } from "@/utils/tts";
import WebcamVideo from "./webcam";
import WebcamAudio from "./audio";
import TextFeed from "./textfeed";
import VoiceSelector from "./voiceselector";
import {
  SpeakerIcon,
  GradientMicButton,
  AppHearingIcon,
  PhotoIcon,
} from "@/ui/icons";
import { Box, Typography, Divider } from "@mui/material";
import { useProcessing } from "@/atoms";

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
  const [isRecording, setIsRecording] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const responseId = useRef(0);
  const clickResponseId = useRef(0);
  const isProcessingRef = useRef(false);
  const playAudioRef = useRef(DEFAULT_PLAY_AUDIO);
  const sendPhotosRef = useRef(DEFAULT_SEND_PHOTOS);
  const sendAudioRef = useRef(DEFAULT_SEND_AUDIO);
  const recentImagesRef = useRef<string[]>([]);

  const drawerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isProcessing, setIsProcessing } = useProcessing();

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
      setIsProcessing(true);

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
          playAudio,
          false, // turn off object identification; make sure to use the chat feature
          setIsProcessing
        );

        if (sendPhotosRef.current && recentImagesRef.current.length > 0) {
          recentImagesRef.current = [];
        }
      } catch (error) {
        console.error("Error processing audio with images:", error);
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [playAudio, setIsProcessing]
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

  const processClick = useCallback(
    async (images: string[]) => {
      let data: LLMData = { images: images };

      setIsClickProcessing(true);
      try {
        clickResponseId.current = await callChat(
          data,
          clickResponseId.current,
          setClickResponses,
          false,
          true, // use object identification instead of chat
          setIsProcessing
        );
      } catch (error) {
        console.error("Error processing click:", error);
      } finally {
        setIsClickProcessing(false);
      }
    },
    [setIsProcessing]
  );

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

  const toggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev);
  }, []);

  const handleDrawerEnter = useCallback(() => {
    if (drawerTimeoutRef.current) {
      clearTimeout(drawerTimeoutRef.current);
    }
    setDrawerOpen(true);
  }, []);

  const handleDrawerLeave = useCallback(() => {
    drawerTimeoutRef.current = setTimeout(() => {
      setDrawerOpen(false);
    }, 300);
  }, []);

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <WebcamVideo
        onNewData={handleNewImage}
        onClick={(data: string[]) => {
          processClick(data);
        }}
      />
      <WebcamAudio onNewData={handleNewAudio} isRecording={isRecording} />
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: drawerOpen ? "240px" : "48px",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          transition: "width 0.3s",
        }}
        onMouseEnter={handleDrawerEnter}
        onMouseLeave={handleDrawerLeave}
      >
        <Box
          sx={{
            width: "240px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            opacity: drawerOpen ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Controls
            </Typography>
            <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
              <SpeakerIcon isOn={playAudio} onClick={toggleAudioOutput} />
              <PhotoIcon isOn={sendPhotos} onClick={toggleSendPhotos} />
              <AppHearingIcon isOn={sendAudio} onClick={toggleSendAudio} />
            </Box>
          </Box>
          <Divider />
          <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Agent
            </Typography>
            {clickResponses.length > 0 && (
              <Typography sx={{ mt: 1 }} color="text.secondary">
                {"Responding as: " +
                  clickResponses[clickResponses.length - 1].text}
              </Typography>
            )}
            <Typography variant="h6" color="text.secondary" gutterBottom>
              LLM Responses
            </Typography>
            <TextFeed responses={responses} />
          </Box>
          <Divider />
          <Box sx={{ p: 2, maxHeight: "40%", overflow: "auto" }}>
            <VoiceSelector />
          </Box>
        </Box>
      </Box>
      <GradientMicButton onClick={toggleRecording} isRecording={isRecording} />
    </Box>
  );
}
