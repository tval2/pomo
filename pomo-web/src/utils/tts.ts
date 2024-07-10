import { cleanTextPlayed, isEndOfSentence } from "./helpers";

let audioContext: AudioContext | null = null;
let audioQueue: string[] = [];
let isPlaying = false;

export async function streamTTS(text: string): Promise<void> {
  if (typeof window === "undefined") {
    console.warn("streamTTS called in a non-browser environment");
    return;
  }

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error accessing TTS:", errorData.message);
      return;
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    if (!audioContext) {
      audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    await playAudioBuffer(audioBuffer);
  } catch (error) {
    console.error("Error streaming TTS:", error);
  }
}

async function playAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const source = audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext!.destination);

    source.onended = () => resolve();

    const errorHandler = (e: Event) => {
      audioContext!.removeEventListener("error", errorHandler);
      reject(new Error("Audio playback error"));
    };
    audioContext!.addEventListener("error", errorHandler);

    try {
      source.start();
    } catch (error) {
      reject(error);
    }
  });
}

export function stopAudio() {
  audioQueue = [];
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  isPlaying = false;
}
