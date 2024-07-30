import React, { useEffect, useState, useCallback, useRef } from "react";
import { stopAudio, isPlaying } from "../utils/tts";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";
import { WaveFile } from "wavefile";

// currently sampling at 16kHz (16,000 samples per second) @ frame rate of
//  512 samples per frame, which is 31.25 frames per second (or 0.032 seconds per frame).
const VAD_THRESHOLD = 0.7; // require a probability of at least 70% to track voice
const DELAY_AFTER_VOICE_MS = 1700; // wait 1.7 seconds after voice stops before sending audio
const ROLLING_BUFFER_SIZE = 32; // grab the previous 15 frames (or the previous 1 second)

interface WebcamAudioProps {
  onNewData: (data: string) => void;
}

export default function WebcamAudio({ onNewData }: WebcamAudioProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceProbability, setVoiceProbability] = useState(0);
  const engineRef = useRef<any>(null);
  const audioChunksRef = useRef<Int16Array[]>([]);
  const rollingBufferRef = useRef<Int16Array[]>([]);
  const lastVoiceDetectionRef = useRef<number | null>(null);
  const sendAudioTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function convertPCMToWav(pcmData: Int16Array, sampleRate = 16000) {
    const wav = new WaveFile();
    wav.fromScratch(1, sampleRate, "16", pcmData);
    return wav.toBuffer();
  }

  const sendAudioToLLM = useCallback(() => {
    if (audioChunksRef.current.length > 0) {
      const totalLength = audioChunksRef.current.reduce(
        (acc, chunk) => acc + chunk.length,
        0
      );
      const combinedChunks = new Int16Array(totalLength);
      let offset = 0;
      for (const chunk of audioChunksRef.current) {
        combinedChunks.set(chunk, offset);
        offset += chunk.length;
      }

      const wavBuffer = convertPCMToWav(combinedChunks);
      const audioBlob = new Blob([wavBuffer], {
        type: "audio/wav",
      });
      const reader = new FileReader();
      reader.onload = (e) => {
        const audioURL = e.target?.result as string;
        onNewData(audioURL);
      };
      reader.readAsDataURL(audioBlob);
      audioChunksRef.current = [];
    }
  }, [onNewData]);

  const processAudioFrame = useCallback(
    async (inputFrame: Int16Array) => {
      try {
        const response = await fetch("/api/vad", {
          method: "POST",
          body: inputFrame.buffer,
          headers: {
            "Content-Type": "application/octet-stream",
          },
        });
        const { voiceProbability } = await response.json();
        setVoiceProbability(voiceProbability);

        rollingBufferRef.current.push(inputFrame);
        if (rollingBufferRef.current.length > ROLLING_BUFFER_SIZE) {
          rollingBufferRef.current.shift();
        }

        if (voiceProbability > VAD_THRESHOLD) {
          if (isPlaying) {
            stopAudio();
          }

          if (audioChunksRef.current.length === 0) {
            audioChunksRef.current = [...rollingBufferRef.current];
          } else {
            audioChunksRef.current.push(inputFrame);
          }
          lastVoiceDetectionRef.current = Date.now();

          if (sendAudioTimeoutRef.current) {
            clearTimeout(sendAudioTimeoutRef.current);
            sendAudioTimeoutRef.current = null;
          }
        } else if (audioChunksRef.current.length > 0) {
          if (sendAudioTimeoutRef.current === null) {
            sendAudioTimeoutRef.current = setTimeout(() => {
              sendAudioToLLM();
              sendAudioTimeoutRef.current = null;
            }, DELAY_AFTER_VOICE_MS);
          }
        }
      } catch (error) {
        console.error("Error processing audio frame:", error);
      }
    },
    [sendAudioToLLM]
  );

  const startRecording = useCallback(async () => {
    try {
      const engine = {
        onmessage: function (e: MessageEvent) {
          if (e.data.command === "process") {
            processAudioFrame(e.data.inputFrame);
          }
        },
      };
      engineRef.current = engine;
      await WebVoiceProcessor.subscribe(engine);
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert(
        "Failed to start recording. Please check your microphone permissions."
      );
    }
  }, [processAudioFrame]);

  const stopRecording = useCallback(async () => {
    if (engineRef.current) {
      await WebVoiceProcessor.unsubscribe(engineRef.current);
      engineRef.current = null;
    }
    setIsRecording(false);
    sendAudioToLLM();
  }, [sendAudioToLLM]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        WebVoiceProcessor.unsubscribe(engineRef.current);
      }
      if (sendAudioTimeoutRef.current) {
        clearTimeout(sendAudioTimeoutRef.current);
      }
    };
  }, []);

  const percentage = voiceProbability * 100;
  const barLength = Math.floor((percentage / 10) * 3);
  const emptyLength = 30 - barLength;
  const spacer = ` `.repeat(3 - percentage.toFixed(0).length);
  const buttonClasses = `py-2 px-4 text-lg font-bold rounded cursor-pointer transition-colors duration-300 ${
    isRecording ? "bg-green-500" : "bg-red-500"
  } text-white`;

  return (
    <div>
      <div className="flex items-center space-x-4">
        <button onClick={toggleRecording} className={buttonClasses}>
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
        <div
          style={{
            marginTop: "20px",
            fontFamily: "monospace",
            whiteSpace: "pre",
          }}
        >
          Voice Probability:
          <div style={{ marginTop: "5px" }}>
            [{spacer}
            {percentage.toFixed(0)}]|
            {"█".repeat(barLength)}
            {" ".repeat(emptyLength)}|
          </div>
        </div>
      </div>
    </div>
  );
}
