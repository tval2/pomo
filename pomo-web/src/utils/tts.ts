let audioContext: AudioContext | null = null;

export async function streamTTS(text: string): Promise<void> {
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
      const errorData = await response.json();
      console.error("Error accessing TTS:", errorData.message);
      return;
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    if (!audioContext) {
      audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    await playAudioStream(response.body);
  } catch (error) {
    console.error("Error streaming TTS:", error);
  }
}

async function playAudioStream(stream: ReadableStream): Promise<void> {
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
  }
}

export function stopAudio() {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}
