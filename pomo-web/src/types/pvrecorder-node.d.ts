declare module "@picovoice/pvrecorder-node" {
  class PvRecorder {
    constructor(
      frameLength: number,
      deviceIndex?: number,
      bufferedFramesCount?: number
    );

    get frameLength(): number;
    get sampleRate(): number;
    get version(): string;
    get isRecording(): boolean;

    start(): void;
    stop(): void;
    read(): Promise<Int16Array>;
    readSync(): Int16Array;
    setDebugLogging(isDebugLoggingEnabled: boolean): void;
    getSelectedDevice(): string;
    release(): void;

    static getAvailableDevices(): string[];
  }

  export default PvRecorder;
}
