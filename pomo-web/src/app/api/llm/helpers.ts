import axios from "axios";
import fs from "fs";

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

export function fileToGenerativePart(path: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

function logWarnings(
  output: any[],
  levelsToLog: string[] = ["MEDIUM", "HIGH"]
) {
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
