import { NextRequest, NextResponse } from "next/server";
import { sendMessage2LLM } from "./chat";

interface GenerateContentStreamResult {
  stream: AsyncIterable<{ text: () => string }>;
}

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("X-Warmup") === "true") {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const headerID = req.headers.get("X-ObjectID");
    if (!headerID) {
      return new Response(
        JSON.stringify({
          message: "X-ObjectID flag not provided in response header",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const object_id_flag = headerID === "true";

    const body = await req.json();
    if (!body) {
      return new Response(
        JSON.stringify({ message: "No data provided in chat api call" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await sendMessage2LLM(body, object_id_flag);

    if (object_id_flag) {
      return NextResponse.json({ result });
    }

    if (isGenerateContentStreamResult(result)) {
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of result.stream) {
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
    } else {
      return NextResponse.json(
        { message: "Unexpected result type" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error accessing chat:", error);
    return NextResponse.json(
      { message: "Error accessing chat", error: (error as Error).message },
      { status: 500 }
    );
  }
}

function isGenerateContentStreamResult(
  result: any
): result is GenerateContentStreamResult {
  return result && typeof result.stream === "object";
}
