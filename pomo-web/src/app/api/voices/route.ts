// src/app/api/voices/route.ts
import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY4;

if (!ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not set in environment variables");
}

const headers = {
  "xi-api-key": ELEVENLABS_API_KEY,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch voices");
    }

    const data = await response.json();
    const filteredVoices = data.voices
      .filter((voice: any) => {
        return (
          !voice.is_legacy &&
          !voice.voice_verification.requires_verification &&
          voice.high_quality_base_model_ids.includes("eleven_turbo_v2_5")
        );
      })
      .map((voice: any) => ({
        name: voice.name,
        preview_url: voice.preview_url,
        voice_id: voice.voice_id,
        labels: voice.labels,
      }));

    return NextResponse.json(filteredVoices);
  } catch (error) {
    console.error("Error fetching voices:", error);
    return NextResponse.json(
      { message: "Failed to fetch voices", error: (error as Error).message },
      { status: 500 }
    );
  }
}
