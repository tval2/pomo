import { queueAudioText, stopAudio } from "./tts";
import { isEndOfSentence, processChunk } from "./helpers";

type Response = { id: number; text: string };

export type LLMData = { audio?: string; image?: string; text?: string };

export async function callChat(
  data: LLMData,
  responseId: number,
  setResponses: (responses: (prevResponses: Response[]) => Response[]) => void
): Promise<number> {
  if (!data || (!data.image && !data.audio && !data.text)) {
    return responseId;
  }

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify(data),
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
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const processedChunk = processChunk(chunk);

      if (processedChunk) {
        buffer += processedChunk;

        if (isEndOfSentence(buffer) && buffer) {
          queueAudioText(buffer);
          buffer = "";
        }

        setResponses((prevResponses: Response[]) => {
          const lastResponse = prevResponses[prevResponses.length - 1];
          if (lastResponse && lastResponse.id === responseId) {
            return [
              ...prevResponses.slice(0, -1),
              { ...lastResponse, text: lastResponse.text + processedChunk },
            ];
          } else {
            return [...prevResponses, { id: responseId, text: processedChunk }];
          }
        });
      }
    }

    if (buffer) {
      queueAudioText(buffer);
    }

    return responseId + 1;
  } catch (error) {
    console.error("Error calling chat API:", error);
    return responseId;
  }
}

export async function callLLM(
  data: LLMData,
  responseId: number,
  setResponses: (responses: (prevResponses: Response[]) => Response[]) => void
): Promise<number> {
  if (!data || (!data.image && !data.audio && !data.text)) {
    console.error("No data to send to callLLM");
    return responseId;
  }

  try {
    const response = await fetch("/api/llm", {
      method: "POST",
      body: JSON.stringify(data),
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

    let result = await response.json();
    if (!result || !result.result) {
      throw new Error("Response result is null");
    }

    setResponses((prevResponses: Response[]) => {
      const lastResponse = prevResponses[prevResponses.length - 1];
      if (lastResponse && lastResponse.id === responseId) {
        return [
          ...prevResponses.slice(0, -1),
          { ...lastResponse, text: lastResponse.text + result.result },
        ];
      } else {
        return [...prevResponses, { id: responseId, text: result.result }];
      }
    });

    return responseId + 1;
  } catch (error) {
    console.error("Error calling llm API:", error);
    return responseId;
  }
}

export function stopLLMAudio() {
  stopAudio();
}
