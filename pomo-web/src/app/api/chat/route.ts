import { NextRequest, NextResponse } from "next/server";
import { sendMessage2LLM } from "./chat";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.imageData) {
      return NextResponse.json(
        { message: "No image data provided in chat api call" },
        { status: 400 }
      );
    }

    const result = await sendMessage2LLM(body.imageData);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error accessing chat:", error);
    return NextResponse.json(
      { message: "Error accessing chat", error: (error as Error).message },
      { status: 500 }
    );
  }
}
