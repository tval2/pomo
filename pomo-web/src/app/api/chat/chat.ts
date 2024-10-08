import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import {
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_RESPONSE,
  SYSTEM_PROMPT_OBJECT_ID,
  DEFAULT_AGENT_ROLE,
} from "./prompts";
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

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
  safetySettings: safetySettings,
  generationConfig: generationConfig,
});

let chat = model.startChat({
  history: [
    {
      role: "user",
      parts: [{ text: SYSTEM_PROMPT(DEFAULT_AGENT_ROLE) }],
    },
    {
      role: "model",
      parts: [{ text: SYSTEM_PROMPT_RESPONSE(DEFAULT_AGENT_ROLE) }],
    },
  ],
  generationConfig: {
    maxOutputTokens: 100,
  },
});
console.log("Chat started");

function formatDataWithMime(type: string, data: string) {
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

function processDataUri(str: string) {
  const parts = str.split(",");
  if (parts.length !== 2) {
    throw new Error(`Invalid data URI format: ${str.substring(0, 20)}...`);
  }
  return formatDataWithMime(parts[0], parts[1]);
}

function configureLlmData(data: LLMData) {
  let messageData: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;

    if (key === "images" && Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === "string" && item.startsWith("data:")) {
          messageData.push(processDataUri(item));
        } else {
          console.warn(
            `Skipping invalid image data: ${item.substring(0, 20)}...`
          );
        }
      });
    } else if (
      key === "audio" &&
      typeof value === "string" &&
      value.startsWith("data:")
    ) {
      messageData.push(processDataUri(value));
    } else if (typeof value === "string") {
      messageData.push({ text: value });
    } else {
      console.warn(`Skipping invalid data for key: ${key}`);
    }
  }

  if (messageData.length === 0) {
    throw new Error("All props are empty in gatherData");
  }

  return messageData;
}

export async function sendMessage2LLM(data: LLMData, object_id_flag: boolean) {
  if (!data) {
    throw new Error("No data provided in sendMessage2LLM");
  }

  const messageData = configureLlmData(data);

  try {
    // use the regular chat interface
    if (!object_id_flag) {
      let lastLogTime = Date.now();
      const result = await chat.sendMessageStream(messageData);
      console.log(
        `[+${Date.now() - lastLogTime}ms] ${"raw Gemini call length"}`
      );
      return result;
    }

    // otherwise, use the object detection
    messageData.push({ text: SYSTEM_PROMPT_OBJECT_ID });
    const result = await model.generateContent(messageData);
    const response = result.response.text();

    chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT(response) }],
        },
        {
          role: "model",
          parts: [{ text: SYSTEM_PROMPT_RESPONSE(response) }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 100,
      },
    });
    console.log("Chat Restarted");
    return response;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}
