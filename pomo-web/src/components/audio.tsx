"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";

const SHOW_AUDIO = false;
const CHUNK_INTERVAL = 100;
const AUDIO_INTERVAL = 3000;

function usePrevious(value: any) : any {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  },[value]);
  return ref.current;
}

interface WebcamAudioProps {
  onNewData: (data: string) => void
};

export default function WebcamAudio(props: WebcamAudioProps) {
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder>();
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const prevChunks = usePrevious(audioChunks);
  const audioRef = useRef<HTMLAudioElement>(null);

  const setupMediaStream = useCallback(async () => {
    try {
      const as = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      const recorder = new MediaRecorder(as, { mimeType: "audio/ogg" });
      recorder.ondataavailable = (e) => {
        setAudioChunks((audioChunks) => [...audioChunks, e.data]);
      };
      recorder.onstop = () => {
        setAudioChunks([]);
      };
      recorder.start(CHUNK_INTERVAL);
      setAudioRecorder(recorder);
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
        let audio = audioRef.current;
        if (!audio || !audioURL) {
          return;
        }

        let audioData = audioURL as string;
        // FIXME: audio data processing is disable until we fix audio streaming
        // props.onNewData(audioData);
        audio.src = audioData;
      }
      reader.readAsDataURL(new Blob(prevChunks, { type: "audio/ogg" }));
    }
  }, [audioChunks, prevChunks]);

  useEffect(() => {
    async function setupWebcamAudio() {
      if (!audioRecorder) {
        await setupMediaStream();
      }
    }
    setupWebcamAudio();

    if (!audioRecorder) {
      return;
    }

    let interval = setInterval(() => {
      audioRecorder.stop();
      audioRecorder.start(AUDIO_INTERVAL);
    }, AUDIO_INTERVAL);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [audioRecorder]);

  return (
    <audio
      className={"h-full mx-auto " + (SHOW_AUDIO ? "block" : "hidden")}
      ref={audioRef}
      controls
    />
  );
}
