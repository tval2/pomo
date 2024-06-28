const audioContext = new (window.AudioContext ||
  (window as any).webkitAudioContext)();

export async function playAudioStream(url: string) {
  const response = await fetch(url);
  const reader = response.body!.getReader();
  const stream = new ReadableStream({
    start(controller) {
      function push() {
        reader.read().then(({ done, value }) => {
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(value);
          push();
        });
      }
      push();
    },
  });

  const source = audioContext.createBufferSource();
  const audioBuffer = await audioContext.decodeAudioData(
    await streamToArrayBuffer(stream)
  );
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
}

async function streamToArrayBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer.buffer;
}
