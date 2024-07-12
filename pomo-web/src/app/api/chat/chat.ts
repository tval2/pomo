import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_RESPONSE } from "./prompts";
import { LLMData } from "@/utils/llm";

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
  const mimeType64Match = type.match(/data:(.*?);base64/);
  const mimeTypeMatch = type.match(/data:(.*?)/);
  if (mimeType64Match || mimeTypeMatch) {
    const mimeType = (mimeType64Match ?? mimeTypeMatch)![1];
    return {
      inlineData: {
        mimeType: mimeType,
        data: data,
      },
    };
  } else {
    throw new Error("No MIME type found");
  }
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

export async function sendMessage2LLM(data: LLMData) {
  if (!data) {
    throw new Error("No data provided in sendMessage2LLM");
  }

  let messageData = [];
  for (let propData of Object.values(data)) {
    if (!propData) {
      continue;
    }

    if (propData.startsWith("data")) {
      const parts = propData.split(",");
      if (parts.length !== 2) {
        throw new Error("Invalid data format");
      }

      const dataPart = formatData(parts[0], parts[1]);
      messageData.push(dataPart);
    } else {
      messageData.push(propData);
    }
  }

  if (messageData.length === 0) {
    throw new Error("All props are empty in sendMessage2LLM");
  }

  try {
    const result = await chat.sendMessageStream(messageData);
    return result;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}
