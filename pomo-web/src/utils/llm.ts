import { callTTS } from "./tts"; // You'll need to create this file

type Response = { id: number; text: string };

let audioQueue: AudioBuffer[] = [];
let isPlaying = false;
const WORD_LIMIT = 10;

function playNextInQueue() {
  if (audioQueue.length > 0 && !isPlaying) {
    isPlaying = true;
    const audioContext = new AudioContext();
    const source = audioContext.createBufferSource();
    source.buffer = audioQueue.shift()!;
    source.connect(audioContext.destination);
    source.onended = () => {
      isPlaying = false;
      playNextInQueue();
    };
    source.start();
  }
}

export async function callLLM(
  data: string,
  responseId: number,
  isSpeaking: boolean,
  setResponses: (responses: (prevResponses: Response[]) => Response[]) => void
): Promise<number> {
  if (!data) {
    console.error("No data to send to callLLM");
    return responseId;
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
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      accumulatedResponse += chunk;
      buffer += chunk;

      // Process buffer when we have a full sentence / reach a word limit
      if (
        (buffer.includes(".") || buffer.split(" ").length > WORD_LIMIT) &&
        isSpeaking
      ) {
        const audio = await callTTS(buffer);
        audioQueue.push(audio);
        buffer = "";

        if (audioQueue.length === 1) {
          playNextInQueue();
        }
      }

      setResponses((prevResponses: Response[]) => {
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

    if (buffer.trim() && isSpeaking) {
      const audio = await callTTS(buffer);
      audioQueue.push(audio);
      playNextInQueue();
    }

    return responseId + 1;
  } catch (error) {
    console.error("Error calling chat API:", error);
    return responseId;
  }
}
