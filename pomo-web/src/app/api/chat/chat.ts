import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_RESPONSE } from "./prompts";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(
    "API Key is not defined. Ensure GOOGLE_GEMINI_API_KEY is set."
  );
}

const genAI = new GoogleGenerativeAI(apiKey!);

const generationConfig = {
  temperature: 0.9,
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

function formatData(type: string, data: string) {
  return {
    inlineData: {
      mimeType: type.includes("image") ? "image/png" : "audio/ogg",
      data: data,
    },
  };
}

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
  safetySettings: safetySettings,
  generationConfig: generationConfig,
});

const chat = model.startChat({
  history: [
    {
      role: "user",
      parts: [{ text: SYSTEM_PROMPT }],
    },
    {
      role: "model",
      parts: [{ text: SYSTEM_PROMPT_RESPONSE }],
    },
  ],
  generationConfig: {
    maxOutputTokens: 100,
  },
});

export async function sendMessage2LLM(data: string) {
  if (!data) {
    throw new Error("No image data provided in promptLLM");
  }

  const parts = data.split(",");
  if (parts.length !== 2) {
    throw new Error("Invalid data format");
  }

  const dataPart = formatData(parts[0], parts[1]);

  try {
    const result = await chat.sendMessageStream([dataPart]);
    return result;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}
