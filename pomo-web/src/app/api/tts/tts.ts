import { ElevenLabsClient } from "elevenlabs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY2;
const VOICE_ID = "ODq5zmih8GrVes37Dizd"; // Patrick;
// let previousText = "";

if (!ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not set in environment variables");
}

if (!VOICE_ID) {
  throw new Error("ELEVENLABS_VOICE_ID is not set in environment variables");
}

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

export const createAudioStreamFromText = async (text: string) => {
  if (!text) {
    throw new Error("No text provided in TTS call");
  }

  const audioStream = await client.generate({
    voice: "Patrick",
    model_id: "eleven_turbo_v2",
    text,
    // previous_text: previousText,
    stream: true,
  });

  // previousText += text;

  return audioStream;
};
