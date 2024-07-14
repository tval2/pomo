import { NextRequest, NextResponse } from "next/server";
import { createAudioStreamFromText } from "./tts";

export async function POST(req: NextRequest) {
  try {
    const { text, previous_texts, next_texts, index } = await req.json();
    if (!text) {
      return new Response(
        JSON.stringify({ message: "Text data provided in TTS api call" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const audioStream = await createAudioStreamFromText(
      text,
      previous_texts,
      next_texts,
      index
    );

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
    const statusCode = (error as any).statusCode || "Unknown status code";
    console.warn(`Warning: Error accessing TTS: Status code: ${statusCode}`);

    return NextResponse.json(
      { message: "Error accessing TTS API", error: (error as Error).message },
      { status: 500 }
    );
  }
}
