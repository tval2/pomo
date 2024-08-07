import { NextRequest, NextResponse } from "next/server";
import { createAudioStreamFromText, DEFAULT_VOICE_ID } from "./tts";

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("X-Warmup") === "true") {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const { text, next_texts, index, voice_id } = await req.json();
    if (!text) {
      return new Response(
        JSON.stringify({ message: "Text data provided in TTS api call" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const audioStream = await createAudioStreamFromText(
      text,
      next_texts,
      index,
      voice_id ? voice_id : DEFAULT_VOICE_ID
    );

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = audioStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || "Unknown status code";
    console.warn(`Warning: Error accessing TTS: Status code: ${statusCode}`);

    return NextResponse.json(
      { message: "Error accessing TTS API", error: (error as Error).message },
      { status: 500 }
    );
  }
}
