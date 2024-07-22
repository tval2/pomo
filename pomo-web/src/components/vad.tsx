import React, { useEffect, useState } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceActivityIndicatorProps {
  audioData: string | null;
}

const VAD_THRESHOLD = 0.5;

const VAD: React.FC<VoiceActivityIndicatorProps> = ({ audioData }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!audioData) return;

    const checkVoiceActivity = async () => {
      try {
        const response = await fetch("/api/vad", {
          method: "POST",
          body: audioData,
        });

        if (!response.ok) {
          throw new Error("Failed to process audio for VAD");
        }

        const result = await response.json();
        setIsSpeaking(result.voiceProbability > VAD_THRESHOLD);
      } catch (error) {
        console.error("Error checking voice activity:", error);
      }
    };

    checkVoiceActivity();
  }, [audioData]);

  return (
    <div className="fixed top-4 right-4 z-50">
      {isSpeaking ? (
        <Mic className="text-green-500" size={24} />
      ) : (
        <MicOff className="text-red-500" size={24} />
      )}
    </div>
  );
};

export default VAD;
