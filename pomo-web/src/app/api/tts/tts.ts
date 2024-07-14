import { ElevenLabsClient } from "elevenlabs";
import axios from "axios";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY3;
const VOICE_ID = "ODq5zmih8GrVes37Dizd"; // Patrick;

if (!ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not set in environment variables");
}

if (!VOICE_ID) {
  throw new Error("ELEVENLABS_VOICE_ID is not set in environment variables");
}

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

let previousRequestIds: { [key: number]: string } = {};

function getLastThreeIds(index: number, previous_texts: string[]): string[] {
  const start = Math.max(0, index - 3);
  const array_ids = Array.from(
    { length: index - start },
    (_, i) => previousRequestIds[start + i]
  ).filter((id) => id !== undefined);

  if (previous_texts.length != array_ids.length) {
    return [];
  }

  return array_ids;
}

const fetchRequestID = async (index: number) => {
  // TODO: need to update this in 2 ways:
  //  1. hopefully ElevenLabs fixes their SDK to return the request ID
  //  2. if not, and if multiple users are using this then need to find a way to associate the request ID with the correct user
  try {
    const response = await axios({
      method: "GET",
      url: "https://api.elevenlabs.io/v1/history",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200) {
      const history = response.data.history;
      previousRequestIds[index] = history[history.length - 1].request_id;
    } else {
      console.error(`Failed to fetch history. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching request ID:", error);
  }
};

export const createAudioStreamFromText = async (
  text: string,
  previous_texts: string[],
  next_texts: string[],
  index: number
) => {
  if (!text) {
    throw new Error("No text provided in TTS call");
  }

  const previous_request_ids = getLastThreeIds(index, previous_texts);

  const audioStream = await client.generate({
    voice: "Patrick",
    model_id: "eleven_turbo_v2",
    text: text,
    previous_text:
      previous_texts.length === 0 ? undefined : previous_texts.join(" "),
    next_text: next_texts.length === 0 ? undefined : next_texts.join(" "),
    previous_request_ids:
      previous_request_ids.length === 0 ? undefined : previous_request_ids,
    stream: true,
  });

  await fetchRequestID(index).catch(console.error);

  return audioStream;
};
