import { NextRequest, NextResponse } from "next/server";
import { createAudioStreamFromText } from "./tts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.text) {
      return new Response(
        JSON.stringify({ message: "No data provided in TTS api call" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const audioStream = await createAudioStreamFromText(body.text);

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of audioStream) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return new Response(stream, {
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
