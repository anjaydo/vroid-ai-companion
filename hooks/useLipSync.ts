import { Viseme } from "@/interfaces/Viseme";
import { useState, useRef } from "react";
// --- Chú thích quan trọng ---
// Để chạy được component này, bạn cần cài đặt các thư viện sau:
// npm install three @react-three/fiber @react-three/drei
// npm install -D @types/three @types/react
/**
 * Hook tùy chỉnh để xử lý logic lip-sync
 * Nó nhận vào một URL audio, phân tích và trả về dữ liệu viseme.
 */
const useLipSync = () => {
  const [visemes, setVisemes] = useState<Viseme[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const processAudio = async (url: string): Promise<AudioBuffer> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: AudioContext })
          ?.webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;

    // Tải và giải mã audio
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Logic phân tích âm thanh để tạo viseme
    const offlineContext = new OfflineAudioContext(
      1,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = offlineContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);
    source.start(0);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const visemeData: Viseme[] = [];
    const frameInterval = 1 / 60; // Giả định 60fps
    let currentTime = 0;

    while (currentTime < audioBuffer.duration) {
      analyser.getByteFrequencyData(freqData);

      const lowFreq = freqData.slice(0, 5).reduce((a, b) => a + b) / 5;
      const midFreq = freqData.slice(5, 15).reduce((a, b) => a + b) / 10;
      const highFreq = freqData.slice(15, 30).reduce((a, b) => a + b) / 15;

      let currentViseme = "neutral";
      if (lowFreq > 100) currentViseme = "o";
      else if (midFreq > 90) currentViseme = "a";
      else if (highFreq > 80) currentViseme = "i";
      else if (lowFreq > 60 && midFreq > 60) currentViseme = "u";
      else if (midFreq > 50) currentViseme = "e";

      visemeData.push({ time: currentTime, value: currentViseme });

      currentTime += frameInterval;
    }
    await offlineContext.startRendering();

    setVisemes(visemeData);
    return audioBuffer;
  };

  return { processAudio, visemes, setVisemes };
};

export default useLipSync;
