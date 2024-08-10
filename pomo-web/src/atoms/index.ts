import { atom, useAtom } from "jotai";

export const DEFAULT_VOICE_ID = "CYw3kZ02Hs0563khs1Fj"; // Dave (https://elevenlabs.io/docs/voices/premade-voices);
export interface Voice {
  name: string;
  preview_url: string;
  voice_id: string;
  labels: Record<string, string>;
}

export const voicesAtom = atom<Voice[]>([]);
export const selectedVoiceIdAtom = atom<string>(DEFAULT_VOICE_ID);
export const isProcessingAtom = atom<boolean>(false);

export const useProcessing = () => {
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);

  return {
    isProcessing,
    setIsProcessing,
    startProcessing: () => setIsProcessing(true),
    stopProcessing: () => setIsProcessing(false),
  };
};
