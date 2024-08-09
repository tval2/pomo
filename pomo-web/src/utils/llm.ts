import { queueAudioText } from "./tts";
import { isEndOfSentence, processChunk } from "./helpers";
import { log } from "./performance";
import { getStore, isProcessingAtom } from "@/store";

type Response = { id: number; text: string };
export type LLMData = { audio?: string; images?: string[]; text?: string };

const store = getStore();

export async function callChat(
  data: LLMData,
  responseId: number,
  setResponses: (responses: (prevResponses: Response[]) => Response[]) => void,
  playAudio: boolean = true, // Whether to play the audio out loud
  object_identification: boolean = false // Whether to identify the object instead of chat
): Promise<number> {
  if (!data || (!data.images && !data.audio && !data.text)) {
    return responseId;
  }

  async function readEntireStream(response: any) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value);
    }

    return fullText;
  }

  try {
    log("calling Gemini Chat API", object_identification ? "_" : "llm1");
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        "X-ObjectID": object_identification.toString(),
      },
    });
    log("received Gemini Chat API", object_identification ? "_" : "llm2");

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, details: ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    // If only used to ID the object then bypass stream generator
    if (object_identification) {
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
    }

    // If using chat as normal then stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let cumulativeText = "";

    while (true) {
      const { done, value } = await reader.read();
      console.log("Processing chunk", done, "(", value?.length, ")");
      if (done) {
        if (!cumulativeText.trim()) {
          console.log("# EXITING with no text");
          store.set(isProcessingAtom, false);
        }
        break;
      }

      const chunk = decoder.decode(value);
      console.log("Chunk:", chunk);
      cumulativeText += chunk;
      const processedChunk = processChunk(chunk);

      if (processedChunk) {
        buffer += processedChunk;

        if (isEndOfSentence(buffer) && buffer) {
          queueAudioText(buffer, playAudio);
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
      queueAudioText(buffer, playAudio);
    }

    return responseId + 1;
  } catch (error) {
    console.error("Error calling chat API:", error);
    store.set(isProcessingAtom, false);
    return responseId;
  }
}
