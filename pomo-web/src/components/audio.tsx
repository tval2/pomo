import React, { useEffect, useState, useCallback, useRef } from "react";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";

const VAD_THRESHOLD = 0.5;

interface WebcamAudioProps {
  onNewData: (data: string) => void;
}

export default function WebcamAudio({ onNewData }: WebcamAudioProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Int16Array[]>([]);
  const [voiceProbability, setVoiceProbability] = useState(0);
  const engineRef = useRef<any>(null);

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

        if (voiceProbability > VAD_THRESHOLD) {
          setAudioChunks((chunks) => [...chunks, inputFrame]);
        } else if (audioChunks.length > 0) {
          sendAudioToLLM();
        }
      } catch (error) {
        console.error("Error processing audio frame:", error);
      }
    },
    [audioChunks]
  );

  const sendAudioToLLM = useCallback(() => {
    if (audioChunks.length > 0) {
      const totalLength = audioChunks.reduce(
        (acc, chunk) => acc + chunk.length,
        0
      );
      const combinedChunks = new Int16Array(totalLength);
      let offset = 0;
      for (const chunk of audioChunks) {
        combinedChunks.set(chunk, offset);
        offset += chunk.length;
      }

      const audioBlob = new Blob([combinedChunks.buffer], {
        type: "audio/raw",
      });
      const reader = new FileReader();
      reader.onload = (e) => {
        const audioURL = e.target?.result as string;
        onNewData(audioURL);
      };
      reader.readAsDataURL(audioBlob);
      setAudioChunks([]);
    }
  }, [audioChunks, onNewData]);

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
