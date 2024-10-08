import { NextRequest, NextResponse } from "next/server";
import { detectVoice } from "./vad";

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("X-Warmup") === "true") {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const audioData = await req.arrayBuffer();
    const int16Array = new Int16Array(audioData);

    if (int16Array.length === 0) {
      throw new Error("No valid audio data received");
    }

    const voiceProbability = await detectVoice(int16Array);
    return NextResponse.json({ voiceProbability });
  } catch (error) {
    console.error("Error processing audio for VAD:", error);
    if (error instanceof RangeError) {
      return NextResponse.json(
        { error: "Invalid audio data format" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to process audio for VAD" },
      { status: 500 }
    );
  }
}
