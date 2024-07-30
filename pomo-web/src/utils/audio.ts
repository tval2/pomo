import { useState, useEffect, useCallback } from "react";

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function getAnalyser(): AnalyserNode {
  if (!analyser) {
    const ctx = getAudioContext();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(ctx.destination);
  }
  return analyser;
}

export function connectToAnalyser(sourceNode: AudioNode): void {
  const analyserNode = getAnalyser();
  sourceNode.connect(analyserNode);
}

export function useAudioAnalyzer() {
  const [volume, setVolume] = useState<number>(0);

  const updateVolume = useCallback(() => {
    const analyserNode = getAnalyser();
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(dataArray);
    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const newVolume = average / 255;
    setVolume(newVolume);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(updateVolume, 100);
    return () => clearInterval(intervalId);
  }, [updateVolume]);

  return { volume };
}
