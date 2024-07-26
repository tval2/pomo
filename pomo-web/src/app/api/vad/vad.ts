import path from "path";
import os from "os";

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

  const { Cobra } = await import("@picovoice/cobra-node");
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
