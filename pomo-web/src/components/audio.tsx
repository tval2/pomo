"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";

const SHOW_AUDIO = false;
const CHUNK_INTERVAL = 100;
const AUDIO_INTERVAL = 3000;

function usePrevious(value: any): any {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

interface WebcamAudioProps {
  onNewData: (data: string) => void;
}

const getSupportedMimeType = () => {
  const possibleTypes = ["audio/webm", "audio/ogg", "audio/mp3", "audio/wav"];

  for (const type of possibleTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  throw new Error("No supported MIME type found for MediaRecorder");
};

export default function WebcamAudio(props: WebcamAudioProps) {
  const [audioStream, setAudioStream] = useState<MediaStream>();
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder>();
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioIndex, setAudioIndex] = useState<number>(0);
  const prevChunks = usePrevious(audioChunks);
  const audioContainerRef = useRef<HTMLDivElement>(null);

  const setupMediaStream = useCallback(async () => {
    try {
      const as = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      setAudioStream(as);
    } catch (e) {
      alert("Audio is disabled");
      throw e;
    }
  }, []);

  useEffect(() => {
    if (audioChunks.length === 0 && prevChunks?.length > 0) {
      var reader = new FileReader();
      reader.onload = (e) => {
        let audioURL = e.target?.result;
        // console.log("New audio blob " + audioURL);
        let container = audioContainerRef.current;
        if (!container || !audioURL) {
          return;
        }

        const MAX_AUDIO_ELEMENTS = 10;
        let audioData = audioURL as string;
        if (container.children.length < MAX_AUDIO_ELEMENTS) {
          let audio = document.createElement("audio");
          audio.controls = true;
          audio.src = audioData;
          container.appendChild(audio);
        } else {
          let audio = container.children[audioIndex] as HTMLAudioElement;
          audio.src = audioData;
          setAudioIndex((audioIndex) => {
            return (audioIndex + 1) % MAX_AUDIO_ELEMENTS;
          });
        }
        props.onNewData(audioData);
      };
      reader.readAsDataURL(
        new Blob(prevChunks, { type: getSupportedMimeType() })
      );
    }
  }, [audioChunks, prevChunks]);

  useEffect(() => {
    async function setupWebcamAudio() {
      if (!audioStream) {
        await setupMediaStream();
      }
    }
    setupWebcamAudio();

    let interval = setInterval(() => {
      if (!audioStream) {
        return;
      }

      if (audioRecorder) {
        audioRecorder.stop();
      }

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(audioStream, { mimeType: mimeType });
      recorder.ondataavailable = (e) => {
        setAudioChunks((audioChunks) => [...audioChunks, e.data]);
      };
      recorder.onstop = () => {
        setAudioChunks(() => []);
      };
      recorder.start(CHUNK_INTERVAL);
      setAudioRecorder(() => recorder);
    }, AUDIO_INTERVAL);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [audioStream, audioRecorder]);

  return (
    <div
      className={"w-fit h-full mx-auto " + (SHOW_AUDIO ? "block" : "hidden")}
      ref={audioContainerRef}
    />
  );
}
