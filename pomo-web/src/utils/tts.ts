let audioContext: AudioContext | null = null;
let audioQueue: ReadableStream[] = [];
let isPlaying = false;

export async function streamTTS(text: string) {
  if (typeof window === "undefined") {
    console.warn("streamTTS called in a non-browser environment");
    return;
  }

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    if (!audioContext) {
      audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    if (!isPlaying && audioQueue.length === 0) {
      // If nothing is playing and the queue is empty, start playing immediately
      playAudioStream(response.body);
    } else {
      // Otherwise, add to the queue
      audioQueue.push(response.body);
    }
  } catch (error) {
    console.error("Error streaming TTS:", error);
  }
}

async function playAudioStream(stream: ReadableStream) {
  isPlaying = true;
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const audioBuffer = await audioContext!.decodeAudioData(value.buffer);
      const source = audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext!.destination);

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }
  } catch (error) {
    console.error("Error playing audio stream:", error);
  } finally {
    isPlaying = false;
    playNextInQueue();
  }
}

function playNextInQueue() {
  if (audioQueue.length > 0) {
    const nextStream = audioQueue.shift()!;
    playAudioStream(nextStream);
  }
}

export function stopAudio() {
  // Placeholder function for interruptions later
  audioQueue = [];
  isPlaying = false;
}
