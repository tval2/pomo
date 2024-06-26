import { NextRequest, NextResponse } from "next/server";
import { promptLLM } from "./llm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.imageData) {
      return NextResponse.json(
        { message: "No image data provided in llm api call" },
        { status: 400 }
      );
    }

    const result = await promptLLM(body.imageData);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error accessing LLM:", error);
    return NextResponse.json(
      { message: "Error accessing LLM", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Please use POST requests @ /api/llm",
  });
}
