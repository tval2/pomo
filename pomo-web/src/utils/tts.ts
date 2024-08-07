import { cleanTextPlayed } from "./helpers";
import {
  getAudioContext,
  connectToAnalyser,
  stopCurrentAudio,
} from "./audioContextManager";
import { log } from "./performance";
import { getDefaultStore } from "jotai/vanilla";
import { selectedVoiceIdAtom } from "@/atoms/voices";

let audioEnabled = true;

interface QueueItem {
  text: string;
  nextTexts: string[];
  audioBuffer?: AudioBuffer;
  status: "pending" | "fetching" | "ready" | "playing";
  index: number;
  createdAt: number;
}

let audioQueue: QueueItem[] = [];
const readyList: Set<number> = new Set();
export let isPlaying = false;
let currentIndex = 0;
let lastActivityTimestamp = Date.now();

const MAX_CONCURRENT_FETCHES = 3;
const MAX_CONTEXT_ITEMS = 3;
const MIN_NEXT_TEXTS = 1;
const MAX_WAIT_TIME = 3000;
const RETRY_FETCH_DELAY = 50;

function isSentenceEnding(text: string): boolean {
  const trimmedText = text.trim();
  return (
    trimmedText.endsWith(".") ||
    trimmedText.endsWith("?") ||
    trimmedText.endsWith("!")
  );
}

export async function queueAudioText(text: string, enabled: boolean) {
  audioEnabled = enabled;

  const cleanedText = cleanTextPlayed(text);
  if (cleanedText) {
    const newItem: QueueItem = {
      text: cleanedText,
      nextTexts: [],
      status: "pending",
      index: currentIndex++,
      createdAt: Date.now(),
    };

    updateContextForQueueItems(newItem);
    audioQueue.push(newItem);
    lastActivityTimestamp = Date.now();
  }

  if (audioEnabled) {
    fetchNextAudio();
    if (!isPlaying) {
      playNextInQueue();
    }
  }
}

// add current item text to previous 3 (or whatever MAX_CONTEXT_ITEMS is) items' nextTexts
function updateContextForQueueItems(newItem: QueueItem): void {
  const queueLength = audioQueue.length;
  const contextItemsCount = Math.min(MAX_CONTEXT_ITEMS, queueLength);

  for (let i = 0; i < contextItemsCount; i++) {
    const index = queueLength - 1 - i;
    audioQueue[index].nextTexts.push(newItem.text);
  }
}

function waitStatus(item: QueueItem): boolean {
  if (item.index === 0) {
    return false;
  }

  // If the previous item hasn't been processed yet, wait
  if (!readyList.has(item.index - 1)) {
    return true;
  }

  // If the sentence is ending, don't wait
  if (isSentenceEnding(item.text)) {
    return false;
  }

  // If the following text has been added to the queue, don't wait
  if (item.nextTexts.length >= MIN_NEXT_TEXTS) {
    return false;
  }

  // If we've already been waiting long enough, don't wait
  if (Date.now() - item.createdAt >= MAX_WAIT_TIME) {
    return false;
  }

  // Default case: wait
  return true;
}

async function fetchNextAudio() {
  if (audioQueue.length === 0) {
    return;
  }

  const pendingItems = audioQueue.filter((item) => item.status === "pending");
  const fetchingItems = audioQueue.filter((item) => item.status === "fetching");

  if (
    pendingItems.length === 0 ||
    fetchingItems.length >= MAX_CONCURRENT_FETCHES
  ) {
    return;
  }

  const item = pendingItems[0];

  if (waitStatus(item)) {
    setTimeout(fetchNextAudio, RETRY_FETCH_DELAY); // Check again after a short delay
    return;
  }

  item.status = "fetching";

  try {
    const audioBuffer = await streamTTS(item);
    item.status = "ready";
    readyList.add(item.index);
    item.audioBuffer = audioBuffer;

    if (!isPlaying) {
      playNextInQueue();
    }
  } catch (error) {
    console.error("Error fetching audio:", error);
    item.status = "pending";
  }

  fetchNextAudio();
}

export async function streamTTS(item: QueueItem): Promise<AudioBuffer> {
  if (typeof window === "undefined") {
    throw new Error("streamTTS called in a non-browser environment");
  }

  const audioCtx = getAudioContext();
  const store = getDefaultStore();
  const selectedVoiceId = store.get(selectedVoiceIdAtom);

  log("calling ElevenLabs API", "tts1");
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: item.text,
      next_texts: item.nextTexts,
      index: item.index,
      voice_id: selectedVoiceId,
    }),
  });
  log("received ElevenLabs API", "tts2");

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error accessing TTS: ${errorData.message}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

async function playNextInQueue() {
  if (audioQueue.length === 0 || !audioEnabled) {
    isPlaying = false;
    return;
  }

  const firstItem = audioQueue[0];

  if (firstItem.status !== "ready") {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  firstItem.status = "playing";

  const audioCtx = getAudioContext();
  const source = audioCtx.createBufferSource();
  source.buffer = firstItem.audioBuffer!;

  connectToAnalyser(source);
  source.connect(audioCtx.destination);

  source.onended = () => {
    audioQueue.shift();
    playNextInQueue();
  };

  source.start();
  log("starting speech", "audio");

  fetchNextAudio();
}

export function stopAudio() {
  stopCurrentAudio();
  audioQueue = [];
  isPlaying = false;
  currentIndex = 0;
}

export function setAudioEnabled(enabled: boolean) {
  audioEnabled = enabled;
  if (!enabled) {
    stopAudio();
  } else if (audioQueue.length > 0 && !isPlaying) {
    playNextInQueue();
  }
}
