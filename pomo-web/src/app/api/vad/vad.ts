import path from "path";
import os from "os";
import fs from "fs";
console.log("Node.js ABI version:", process.versions.modules);

const PICOVOICE_API_KEY = process.env.PICOVOICE_API_KEY!;

let cobra: any = null;
let initializationPromise: Promise<void> | null = null;

async function initializeCobra() {
  if (cobra) return;

  const platform = os.platform();
  const arch = os.arch();

  let libraryPath = path.join(
    process.cwd(),
    "node_modules",
    "@picovoice",
    "cobra-node",
    "lib"
  );

  if (platform === "win32") {
    libraryPath = path.join(libraryPath, "windows", arch, "pv_cobra.dll");
  } else if (platform === "darwin") {
    libraryPath = path.join(libraryPath, "mac", arch, "pv_cobra.node");
  } else if (platform === "linux") {
    libraryPath = path.join(libraryPath, "linux", arch, "pv_cobra.so");
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  console.log("Attempting to load library from:", libraryPath);

  if (fs.existsSync(libraryPath)) {
    console.log("Library file exists");
  } else {
    console.log("Library file does not exist");
    // List the contents of the parent directory
    const parentDir = path.dirname(libraryPath);
    console.log("Contents of", parentDir, ":");
    fs.readdirSync(parentDir).forEach((file) => {
      console.log("- " + file);
    });
  }

  console.log("About to dynamically import Cobra");
  const { Cobra } = await import("@picovoice/cobra-node");
  console.log("Cobra imported successfully");

  cobra = new Cobra(PICOVOICE_API_KEY, { libraryPath });
}

export async function detectVoice(data: Int16Array): Promise<number> {
  if (!initializationPromise) {
    initializationPromise = initializeCobra().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  try {
    await initializationPromise;
    return cobra.process(data);
  } catch (error) {
    console.error("Picovoice Error:", error);
    throw new Error("Picovoice Error");
  }
}

if (typeof process !== "undefined") {
  process.on("exit", () => {
    if (cobra) {
      cobra.release();
    }
  });
}
