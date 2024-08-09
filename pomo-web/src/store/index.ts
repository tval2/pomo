import { atom } from "jotai";
import { createStore } from "jotai/vanilla";

export const isPlayingAtom = atom(false);
export const isProcessingAtom = atom(false);

export function getStore() {
  return createStore();
}
