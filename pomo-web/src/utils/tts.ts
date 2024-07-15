import { cleanTextPlayed } from "./helpers";

let audioContext: AudioContext | null = null;

interface QueueItem {
  text: string;
  nextTexts: string[];
  audioBuffer?: AudioBuffer;
  status: "pending" | "fetching" | "ready" | "playing";
  index: number;
}

let audioQueue: QueueItem[] = [];
let isPlaying = false;
let isFetching = false;
let currentIndex = 0;

const MAX_CONCURRENT_FETCHES = 3;
const MAX_CONTEXT_ITEMS = 3;

export async function queueAudioText(text: string) {
  const cleanedText = cleanTextPlayed(text);
  if (cleanedText) {
    const newItem: QueueItem = {
      text: cleanedText,
      nextTexts: [],
      status: "pending",
      index: currentIndex++,
    };

    updateContextForQueueItems(newItem);
    audioQueue.push(newItem);
  }

  if (!isPlaying) {
    playNextInQueue();
  }
  if (!isFetching) {
    fetchNextAudio();
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

async function fetchNextAudio() {
  if (audioQueue.length === 0) {
    isFetching = false;
    return;
  }

  const pendingItems = audioQueue.filter((item) => item.status === "pending");
  const fetchingItems = audioQueue.filter((item) => item.status === "fetching");

  if (
    pendingItems.length === 0 ||
    fetchingItems.length >= MAX_CONCURRENT_FETCHES
  ) {
    isFetching = false;
    return;
  }

  isFetching = true;
  const item = pendingItems[0];
  item.status = "fetching";

  try {
    const audioBuffer = await streamTTS(item);
    item.audioBuffer = audioBuffer;
    item.status = "ready";

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

  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: item.text,
      next_texts: item.nextTexts,
      index: item.index,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error accessing TTS: ${errorData.message}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

async function playNextInQueue() {
  if (audioQueue.length === 0) {
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

  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }

  const source = audioContext!.createBufferSource();
  source.buffer = firstItem.audioBuffer!;
  source.connect(audioContext.destination);

  source.onended = () => {
    audioQueue.shift();
    playNextInQueue();
  };

  source.start();

  if (!isFetching) {
    fetchNextAudio();
  }
}

export function stopAudio() {
  audioQueue = [];
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  isPlaying = false;
  isFetching = false;
  currentIndex = 0;
}
