"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { LLMData, callChat, callLLM } from "../utils/llm";
import { setAudioEnabled } from "../utils/tts";
import WebcamVideo from "./webcam";
import WebcamAudio from "./audio";
import TextFeed from "./textfeed";
import { AudioVisualizer } from "./audioviz";
import { Box, Drawer, IconButton, Typography, Tooltip } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Mic, Volume2 } from "lucide-react";

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

  const toggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev);
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
        onClick={(data, x, y) => {
          processClick(data, JSON.stringify({ x, y }));
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
        }}
      >
        <AudioVisualizer />
        <WebcamAudio onNewData={handleNewAudio} isRecording />
      </Box>
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "48px",
          backgroundColor: "rgba(0, 0, 255, 0.5)",
          transition: "width 0.3s",
          "&:hover": {
            width: "240px",
          },
        }}
        onMouseEnter={() => setDrawerOpen(true)}
        onMouseLeave={() => setDrawerOpen(false)}
      >
        <Box
          sx={{
            width: "240px",
            height: "100%",
            p: 2,
            display: "flex",
            flexDirection: "column",
            opacity: drawerOpen ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Controls
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Tooltip title={playAudio ? "TTS On" : "TTS Off"}>
              <IconButton
                onClick={toggleAudioOutput}
                color={playAudio ? "primary" : "default"}
              >
                <Volume2 size={24} />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={sendPhotos ? "Sending images" : "Not sending images"}
            >
              <IconButton
                onClick={toggleSendPhotos}
                color={sendPhotos ? "primary" : "default"}
              >
                {/* Add an appropriate icon for sending photos */}
              </IconButton>
            </Tooltip>
            <Tooltip title={sendAudio ? "Sending audio" : "Not sending audio"}>
              <IconButton
                onClick={toggleSendAudio}
                color={sendAudio ? "primary" : "default"}
              >
                {/* Add an appropriate icon for sending audio */}
              </IconButton>
            </Tooltip>
          </Box>
          {clickResponses.length > 0 && (
            <Typography sx={{ mt: 2 }}>
              {"Responding as: " +
                clickResponses[clickResponses.length - 1].text}
            </Typography>
          )}
          <TextFeed responses={responses} />
        </Box>
      </Box>
      <Tooltip title={isRecording ? "Stop Recording" : "Start Recording"}>
        <IconButton
          sx={{
            position: "absolute",
            bottom: 20,
            right: 20,
            backgroundColor: isRecording ? "green" : "blue",
            color: "white",
            "&:hover": {
              backgroundColor: isRecording ? "darkgreen" : "darkblue",
            },
          }}
          onClick={toggleRecording}
        >
          <Mic size={24} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
