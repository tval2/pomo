import { ElevenLabsClient } from "elevenlabs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
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

// const response = await axios({
//     method: "POST",
//     url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
//     headers: {
//       Accept: "audio/mpeg",
//       "xi-api-key": ELEVENLABS_API_KEY,
//       "Content-Type": "application/json",
//     },
//     data: {
//       text: body.text,
//       model_id: "eleven_turbo_v2",
//       voice_settings: {
//         stability: 0.5,
//         similarity_boost: 0.5,
//       },
//     },
//     responseType: "arraybuffer",
//   });

export const createAudioStreamFromText = async (text: string) => {
  if (!text) {
    throw new Error("No text provided in TTS call");
  }

  const audioStream = await client.generate({
    voice: "Patrick",
    model_id: "eleven_turbo_v2",
    text,
  });

  return audioStream;
};
