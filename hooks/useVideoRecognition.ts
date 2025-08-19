import { Viseme } from "@/interfaces/Viseme";
import { create } from "zustand";

export const useVideoRecognition = create((set) => ({
  videoElement: null,
  setVideoElement: (videoElement: HTMLVideoElement | null) =>
    set({ videoElement }),
  resultsCallback: null,
  setResultsCallback: (resultsCallback: (results: Viseme[]) => void) =>
    set({ resultsCallback }),
}));
