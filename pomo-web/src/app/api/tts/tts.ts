interface IdTextPair {
  id: string;
  text: string;
}

interface ResponseDictionary {
  [index: number]: IdTextPair;
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY4;
const VOICE_ID = "CYw3kZ02Hs0563khs1Fj"; // Dave (https://elevenlabs.io/docs/voices/premade-voices);
const FIRST_INDEX_LATENCY = 1; // integer 0-4 (higher = faster but worse quality)

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
    model_id: "eleven_turbo_v2_5",
    text: text,
    previous_text: prev_texts.length == 0 ? undefined : prev_texts.join(" "),
    next_text: next_texts.length == 0 ? undefined : next_texts.join(" "),
    previous_request_ids: prev_ids.length == 0 ? undefined : prev_ids,
    optimize_streaming_latency: index === 0 ? FIRST_INDEX_LATENCY : 0,
  };

  if (!options.next_text) {
    console.log("No next text provided for index ", index);
  }
  if (!options.previous_text) {
    console.log("No prev text provided for index ", index);
  }
  if (!options.previous_request_ids) {
    console.log("No prev text ID provided for index ", index);
  }

  let lastLogTime = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(options),
  });
  console.log(
    `[+${Date.now() - lastLogTime}ms] ${"raw ElevenLabs call length"}`
  );

  const id = response.headers.get("request-id");

  if (!response.ok || !id || !response.body) {
    throw new Error(`No response body or ID received from ElevenLabs API. 
    Given Status ${response.status} and Text ${response.statusText}. If status 
    is 401 we have exceeded the API limit.`);
  }

  previousResponses[index] = { id: id, text: text };

  return response.body;
};
