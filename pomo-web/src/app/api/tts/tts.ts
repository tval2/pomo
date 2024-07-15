interface IdTextPair {
  id: string;
  text: string;
}

interface ResponseDictionary {
  [index: number]: IdTextPair;
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY3;
const VOICE_ID = "ODq5zmih8GrVes37Dizd"; // Patrick;

if (!ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not set in environment variables");
}

if (!VOICE_ID) {
  throw new Error("ELEVENLABS_VOICE_ID is not set in environment variables");
}

const headers = {
  "xi-api-key": ELEVENLABS_API_KEY,
  "Content-Type": "application/json",
};
const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`;

let previousResponses: ResponseDictionary = {};

function getLastThreeIds(index: number): { ids: string[]; texts: string[] } {
  const start = Math.max(0, index - 3);
  const ids: string[] = [];
  const texts: string[] = [];

  for (let i = start; i < index; i++) {
    const response = previousResponses[i];
    if (!response) {
      throw new Error(`Response at index ${i} is undefined`);
    }
    if (response.id == null) {
      throw new Error(`ID at index ${i} is null or undefined`);
    }
    if (response.text == null) {
      throw new Error(`Text at index ${i} is null or undefined`);
    }

    ids.push(response.id);
    texts.push(response.text);
  }

  return { ids, texts };
}

export const createAudioStreamFromText = async (
  text: string,
  next_texts: string[],
  index: number
): Promise<ReadableStream<Uint8Array>> => {
  if (!text) {
    throw new Error("No text provided in TTS call");
  }

  const { ids: prev_ids, texts: prev_texts } = getLastThreeIds(index);

  const options = {
    model_id: "eleven_turbo_v2",
    text: text,
    previous_text: prev_texts.length == 0 ? undefined : prev_texts.join(" "),
    next_text: next_texts.length == 0 ? undefined : next_texts.join(" "),
    previous_request_ids: prev_ids.length == 0 ? undefined : prev_ids,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(options),
  });

  const id = response.headers.get("request-id");

  if (!response.ok || !id || !response.body) {
    throw new Error("No response body or ID received from ElevenLabs API");
  }

  previousResponses[index] = { id: id, text: text };

  return response.body;
};
