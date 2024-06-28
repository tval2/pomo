import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "ODq5zmih8GrVes37Dizd"; // Patrick;

if (!ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not set in environment variables");
}

if (!VOICE_ID) {
  throw new Error("ELEVENLABS_VOICE_ID is not set in environment variables");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.text) {
      return new Response(
        JSON.stringify({ message: "No data provided in TTS api call" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        Accept: "audio/mpeg",
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        text: body.text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      },
      responseType: "arraybuffer",
    });

    return new Response(response.data, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (error) {
    console.error("Error accessing TTS.:", error);
    return NextResponse.json(
      { message: "Error accessing TTS", error: (error as Error).message },
      { status: 500 }
    );
  }
}
