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

const prompt = `Here are two images. The first is a screenshot from a webcam. The second is the same image,
but with everything masked out in black except for an object of interest. Identify the object of interest in
the context of the full image using a simple description. No more than just a word or a few words. If the
object is part of a larger object, identify the larger object. For example, if the object of interest is a
hand and you can see the rest of the person, identify the person, or if the object of interest is a cushion
and you can see the rest of the couch, identify the couch.`

export async function promptLLM(data: LLMData) {
  if (!data) {
    throw new Error("No data provided in promptLLM");
  }

  if (!data.images) {
    throw new Error("Missing images in promptLLM");
  }

  let dataParts: any[] = [prompt];
  for (let image of data.images) {
    const parts = image.split(",");
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
    dataParts.push(imagePart);
  }

  try {
    const result = await model.generateContent(dataParts);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}
