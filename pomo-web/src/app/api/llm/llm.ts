import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
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

const getPrompt = (coords: string) => {
  return `Identify the object at the normalized pixel coordinates ${coords} in this
  photo. Provide a succinct, simple description and nothing else. If the object is
  part of a larger object, identify the larger object. For example, if the coordinates
  are for someones hand or nose, and you can see more of the person, identify the person.`;
};

export async function promptLLM(data: LLMData) {
  if (!data) {
    throw new Error("No data provided in promptLLM");
  }

  if (!data.images || !data.text) {
    throw new Error("Missing image or text in promptLLM");
  }

  const parts = data.images[0].split(",");
  if (parts.length !== 2) {
    throw new Error("Invalid image data format");
  }

  const base64Data = parts[1];
  const imagePart = {
    inlineData: {
      mimeType: "image/png",
      data: base64Data,
    },
  };

  try {
    const result = await model.generateContent([
      getPrompt(data.text),
      imagePart,
    ]);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}
