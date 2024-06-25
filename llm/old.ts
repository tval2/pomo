import type { NextApiRequest, NextApiResponse } from "next";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import axios, { AxiosError } from "axios";
import { FunctionDeclaration, AllowedModelTypes } from "types/llm";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(
    "API Key is not defined. Ensure GOOGLE_GEMINI_API_KEY is set."
  );
}

const betaAPIUrl = "https://generativelanguage.googleapis.com/v1beta/models/";
const genAI = new GoogleGenerativeAI(apiKey!);

const extensionToMime: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

async function getMimeType(url: string): Promise<string> {
  const extensionMatch = url
    .split("?")[0]
    .match(/\.(jpg|jpeg|png|webp|heic|heif)$/i);
  if (extensionMatch) {
    const extension = extensionMatch[1].toLowerCase();
    const mimeType = extensionToMime[extension];
    if (mimeType) {
      return mimeType;
    }
  }

  try {
    console.warn(
      "Basic mime type check failed, trying HEAD request for url: ",
      url
    );
    const response = await axios.head(url);
    const contentType = response.headers["content-type"];
    if (contentType) {
      return contentType.split(";")[0];
    }
  } catch (error) {
    console.error(`Error getting MIME type for URL "${url}":`, error);
  }

  return "application/octet-stream"; // Default or unknown MIME type
}

async function getBase64(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(response.data, "binary").toString("base64");
  } catch (error) {
    console.error(`Error getting image url - "${url}":`, error);
    return null;
  }
}

async function imageUrlsToGenerativePart(imageUrls: string[]) {
  const promises = imageUrls.map(async (url) => {
    const base64 = await getBase64(url);
    const mimeType = await getMimeType(url);
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ].includes(mimeType)
    ) {
      console.warn(`Skipping unsupported or failed image: ${url}`);
      return null;
    }

    if (base64) {
      return {
        inlineData: {
          data: base64,
          mimeType: mimeType,
        },
      };
    }
    return null;
  });

  const parts = await Promise.all(promises);
  return parts.filter((part) => part !== null);
}

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
const levelsToLog = ["MEDIUM", "HIGH"];

function logWarnings(output: any[]) {
  let hasWarnings = false;
  output.forEach((result) => {
    if (levelsToLog.includes(result.probability)) {
      console.warn(
        `Warning: Detected ${result.probability} probability for ${result.category}`
      );
      hasWarnings = true;
    }
  });
  return hasWarnings;
}

// Main function for API call
export async function promptLLM(
  prompt: string,
  modelType: AllowedModelTypes,
  imageUrls: string[] = [],
  functionCalls: FunctionDeclaration[] = []
) {
  try {
    if (modelType === AllowedModelTypes.TEXT) {
      if (imageUrls.length !== 0) {
        throw new Error("Image URLs can't be used for the pure text model");
      }

      if (functionCalls.length === 0) {
        try {
          const model = genAI.getGenerativeModel({
            model: "gemini-pro",
            safetySettings: safetySettings,
            generationConfig: generationConfig,
          });
          const result = await model.generateContent(prompt);
          const response = result.response;
          if (logWarnings((response.candidates as any)[0].safetyRatings)) {
            console.warn(`Warning: Check user input. text: ${prompt}`);
          }
          return response.text();
        } catch (error) {
          console.warn("Gemini API Call Error: ", error);
          return null;
        }
      } else {
        try {
          const result = await axios.post(
            `${betaAPIUrl}${"gemini-pro:generateContent"}?key=${apiKey}`,
            {
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { text: "Call a function no matter what" },
                  ],
                },
              ],
              tools: [{ function_declarations: functionCalls }],
              safetySettings: safetySettings,
              generationConfig: generationConfig,
            }
          );

          // Check that result.data.canditates has one element
          if (result.data.candidates.length !== 1) {
            console.warn(
              "Gemini API returned more than one candidate (or zero)"
            );
          }

          // Check that result.data.canditates[0].content.parts has one element
          if (result.data.candidates[0].content.parts.length !== 1) {
            console.warn("Gemini API returned more than one part (or zero)");
          }

          return result.data.candidates[0].content.parts[0].functionCall;
        } catch (error) {
          console.error("Raw Gemini API Call: \n\n\n");
          if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            if (axiosError.response) {
              console.error("Error Data:", axiosError.response.data);
              console.error("Error Status:", axiosError.response.status);
              console.error("Error Headers:", axiosError.response.headers);
            } else if (axiosError.request) {
              console.error("Error Request:", axiosError.request);
            } else {
              console.error("Error Message:", axiosError.message);
            }
          } else {
            console.error("An unexpected error occurred:", error);
          }
        }
      }
    } else if (modelType === AllowedModelTypes.MULTIMODAL) {
      if (imageUrls.length === 0) {
        throw new Error("Image URLs are required for the multimodal model");
      }

      const imageParts = await imageUrlsToGenerativePart(imageUrls);
      if (imageParts.length === 0) {
        console.warn("All image parts failed to load: ", imageUrls);
        return;
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-pro-vision",
        safetySettings: safetySettings,
        generationConfig: generationConfig,
      });

      try {
        const result = await model.generateContent([
          prompt,
          ...(imageParts as any),
        ]);
        const response = result.response;
        if (logWarnings((response.candidates as any)[0].safetyRatings)) {
          console.warn(`Warning: Check user input. images: ${imageUrls}`);
        }
        return response.text();
      } catch (error) {
        console.warn("Gemini Call Error: ", error);
        return null;
      }
    } else if (modelType === AllowedModelTypes.EMBEDDING) {
      throw new Error("Embeddings not yet supported");
    } else {
      throw new Error("Invalid model type");
    }
  } catch (error) {
    console.error("Error accessing LLM:", error);
    return {
      error: "Error accessing LLM",
      details: (error as Error).message,
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { prompt, modelType, imageUrls, functionCalls } = req.body;

    if (
      typeof prompt !== "string" ||
      !Object.values(AllowedModelTypes).includes(modelType)
    ) {
      return res.status(400).json({
        message:
          "Invalid input: either prompt not of type string or model type not supported",
      });
    }

    if (
      modelType === AllowedModelTypes.MULTIMODAL &&
      (!Array.isArray(imageUrls) ||
        imageUrls.some((url) => typeof url !== "string"))
    ) {
      return res.status(400).json({ message: "Invalid image URLs" });
    }

    const result = await promptLLM(prompt, modelType, imageUrls, functionCalls);
    return res.status(200).json({ result });
  } catch (error) {
    console.error("Error accessing LLM:", error);
    return res.status(500).json({ message: "Error accessing LLM" });
  }
}
