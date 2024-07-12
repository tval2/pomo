import axios from "axios";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY2;
const VOICE_ID = "ODq5zmih8GrVes37Dizd"; // Patrick;
// let previousText = "";

if (!ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not set in environment variables");
}

if (!VOICE_ID) {
  throw new Error("ELEVENLABS_VOICE_ID is not set in environment variables");
}

let previousRequestIds: { [key: number]: number } = {};

export const createAudioStreamFromText = async (
  text: string,
  previous_text: string,
  next_text: string,
  index: number
) => {
  if (!text) {
    throw new Error("No text provided in TTS call");
  }

  const response = await axios({
    method: "POST",
    url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
    headers: {
      Accept: "audio/mpeg",
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    data: {
      model_id: "eleven_turbo_v2",
      text: text,
      previous_text: previous_text === "" ? undefined : previous_text,
      next_text: next_text === "" ? undefined : next_text,
    },
  });

  console.log("response", typeof response.data, "\n $$$$$$ \n\n");
  const audioStream = response.data;

  // previousRequestIds[index] = audioStream.requestId;
  return audioStream;
};
