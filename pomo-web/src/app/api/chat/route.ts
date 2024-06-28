import { NextRequest, NextResponse } from "next/server";
import { sendMessage2LLM } from "./chat";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.data) {
      return new Response(
        JSON.stringify({ message: "No data provided in chat api call" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const streamGenerator = await sendMessage2LLM(body.data);

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of streamGenerator.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            controller.enqueue(chunkText);
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error accessing chat:", error);
    return NextResponse.json(
      { message: "Error accessing chat", error: (error as Error).message },
      { status: 500 }
    );
  }
}