import { NextRequest, NextResponse } from "next/server";
import { promptLLM } from "./llm";

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("X-Warmup") === "true") {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const body = await req.json();
    if (!body) {
      return new Response(
        JSON.stringify({ message: "No data provided in chat api call" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await promptLLM(body);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error accessing LLM:", error);
    return NextResponse.json(
      { message: "Error accessing LLM", error: (error as Error).message },
      { status: 500 }
    );
  }
}
