import { streamTTS, stopAudio } from "./tts"; // You'll need to create this file

type Response = { id: number; text: string };

let audioQueue: string[] = [];
let isPlaying = false;

async function playNextInQueue() {
  if (audioQueue.length > 0 && !isPlaying) {
    isPlaying = true;
    const text = audioQueue.shift()!;
    await streamTTS(text);
    isPlaying = false;
    playNextInQueue();
  }
}

function isEndOfSentence(text: string) {
  const sentenceEndings = [".", "?", "!"];
  return sentenceEndings.some((ending) => text.includes(ending));
}

function cleanText(text: string) {
  return text
    .replace(/\$null\$/g, "")
    .replace(/[\n\t\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

      const chunk = cleanText(decoder.decode(value));
      accumulatedResponse += chunk;
      buffer += chunk;

      if (isEndOfSentence(buffer)) {
        if (buffer && isSpeaking) {
          audioQueue.push(buffer);
          if (!isPlaying) {
            playNextInQueue();
          }
        }
        buffer = "";
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

    if (buffer && isSpeaking) {
      audioQueue.push(buffer);
      if (!isPlaying) {
        playNextInQueue();
      }
    }

    return responseId + 1;
  } catch (error) {
    console.error("Error calling chat API:", error);
    return responseId;
  }
}

export function stopLLMAudio() {
  audioQueue = [];
  stopAudio();
}
