import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { fileToGenerativePart } from "./helpers";

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
  model: "gemini-1.5-pro",
  safetySettings: safetySettings,
  generationConfig: generationConfig,
});

// const path = "/Users/Tim/Downloads/pomo_photo.png";
// const mimeType = "image/png";
const prompt = "Describe this photo";

export async function promptLLM(imageData: string) {
  if (!imageData) {
    throw new Error("No image data provided in promptLLM");
  }

  const parts = imageData.split(",");
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
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}
