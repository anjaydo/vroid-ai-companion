import { VRM, VRMExpressionPresetName } from "@pixiv/three-vrm";
import { useEffect, useRef } from "react";

const BoundingFrequencyMasc = [0, 400, 560, 2400, 4800];
const BoundingFrequencyFem = [0, 500, 700, 3000, 6000];
const FFT_SIZE = 1024;
const samplingFrequency = 44100;

const IndicesFrequencyMale = BoundingFrequencyMasc.map((f) =>
  Math.round(((2 * FFT_SIZE) / samplingFrequency) * f)
);
const IndicesFrequencyFemale = BoundingFrequencyFem.map((f) =>
  Math.round(((2 * FFT_SIZE) / samplingFrequency) * f)
);

class LipSync {
  vrm: VRM;
  audioContext: AudioContext | null = null;
  mediaStreamSource: AudioBufferSourceNode | null = null;
  userSpeechAnalyzer: AnalyserNode | null = null;
  lastFrameTime: number = 0;
  private frameId: number | null = null;

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.update = this.update.bind(this);
  }

  startFromAudioFile(file: ArrayBuffer) {
    this.destroy(); // Dọn dẹp các audio context cũ
    this.audioContext = new AudioContext();
    this.userSpeechAnalyzer = this.audioContext.createAnalyser();
    this.userSpeechAnalyzer.smoothingTimeConstant = 0.5;
    this.userSpeechAnalyzer.fftSize = FFT_SIZE;

    this.audioContext.decodeAudioData(file).then((buffer) => {
      this.mediaStreamSource = this.audioContext!.createBufferSource();
      this.mediaStreamSource.buffer = buffer;
      this.mediaStreamSource.connect(this.audioContext!.destination);
      this.mediaStreamSource.connect(this.userSpeechAnalyzer!);
      this.mediaStreamSource.start();

      this.lastFrameTime = performance.now();
      if (this.frameId) cancelAnimationFrame(this.frameId);
      this.frameId = requestAnimationFrame(this.update);

      this.mediaStreamSource.onended = () => {
        this.resetExpressions();
        if (this.frameId) cancelAnimationFrame(this.frameId);
        this.frameId = null;
      };
    });
  }

  destroy() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.mediaStreamSource?.stop();
    this.mediaStreamSource?.disconnect();
    this.userSpeechAnalyzer?.disconnect();
    this.audioContext?.close();
  }

  resetExpressions() {
    this.vrm.expressionManager?.setValue(VRMExpressionPresetName.Oh, 0);
    this.vrm.expressionManager?.setValue(VRMExpressionPresetName.Aa, 0);
    this.vrm.expressionManager?.setValue(VRMExpressionPresetName.Ee, 0);
    this.vrm.expressionManager?.setValue(VRMExpressionPresetName.Ou, 0);
    this.vrm.expressionManager?.setValue(VRMExpressionPresetName.Ih, 0);
  }

  update() {
    if (!this.userSpeechAnalyzer || !this.vrm.expressionManager) {
      if (this.frameId) this.frameId = requestAnimationFrame(this.update);
      return;
    }

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    const spectrum = new Float32Array(
      this.userSpeechAnalyzer.frequencyBinCount
    );
    this.userSpeechAnalyzer.getFloatFrequencyData(spectrum);

    const sensitivity_threshold = 0.5;
    const stPSD = spectrum.map(
      (val) => sensitivity_threshold + (val + 20) / 140
    );

    const EnergyBinMasc = new Float32Array(BoundingFrequencyMasc.length).fill(
      0
    );
    const EnergyBinFem = new Float32Array(BoundingFrequencyFem.length).fill(0);

    for (let m = 0; m < BoundingFrequencyMasc.length - 1; m++) {
      for (
        let j = IndicesFrequencyMale[m];
        j <= IndicesFrequencyMale[m + 1];
        j++
      ) {
        if (stPSD[j] > 0) EnergyBinMasc[m] += stPSD[j];
      }
      EnergyBinMasc[m] /=
        IndicesFrequencyMale[m + 1] - IndicesFrequencyMale[m] + 1;
    }

    for (let m = 0; m < BoundingFrequencyFem.length - 1; m++) {
      for (
        let j = IndicesFrequencyFemale[m];
        j <= IndicesFrequencyFemale[m + 1];
        j++
      ) {
        if (stPSD[j] > 0) EnergyBinFem[m] += stPSD[j];
      }
      EnergyBinFem[m] /=
        IndicesFrequencyFemale[m + 1] - IndicesFrequencyFemale[m] + 1;
    }

    const oh =
      Math.max(EnergyBinFem[1], EnergyBinMasc[1]) > 0.2
        ? 1 - 2 * Math.max(EnergyBinMasc[2], EnergyBinFem[2])
        : (1 - 2 * Math.max(EnergyBinMasc[2], EnergyBinFem[2])) *
          5 *
          Math.max(EnergyBinMasc[1], EnergyBinFem[1]);
    const aa = 3 * Math.max(EnergyBinMasc[3], EnergyBinFem[3]);
    const ee =
      0.8 *
      (Math.max(EnergyBinMasc[1], EnergyBinFem[1]) -
        Math.max(EnergyBinMasc[3], EnergyBinFem[3]));

    // Áp dụng giá trị blendshape
    this.vrm.expressionManager.setValue(
      VRMExpressionPresetName.Oh,
      oh > 0 ? oh : 0
    );
    this.vrm.expressionManager.setValue(
      VRMExpressionPresetName.Aa,
      aa > 0 ? aa : 0
    );
    this.vrm.expressionManager.setValue(
      VRMExpressionPresetName.Ee,
      ee > 0 ? ee : 0
    ); // Ee tương đương I

    this.vrm.expressionManager.update();

    this.frameId = requestAnimationFrame(this.update);
  }
}

/**
 * React Hook để quản lý vòng đời của lớp LipSync
 */
const useAdvancedLipSync = (vrm: VRM | null) => {
  const lipSyncRef = useRef<LipSync | null>(null);

  useEffect(() => {
    if (vrm) {
      lipSyncRef.current = new LipSync(vrm);
    }
    // Cleanup function
    return () => {
      lipSyncRef.current?.destroy();
    };
  }, [vrm]);

  const startLipSyncFromFile = async (
    url: string,
    onEnded: () => void = () => {}
  ) => {
    if (lipSyncRef.current) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        lipSyncRef.current.startFromAudioFile(arrayBuffer);
      } catch (error) {
        console.error("Lỗi khi xử lý file audio:", error);
      } finally {
        onEnded();
      }
    }
  };

  return { startLipSyncFromFile };
};

export default useAdvancedLipSync;
