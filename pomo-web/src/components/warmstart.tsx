"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { voicesAtom } from "@/atoms";

const API_ROUTES = ["chat", "tts", "vad"];
const DAVE_DATA = {
  name: "Dave",
  voice_id: "CYw3kZ02Hs0563khs1Fj",
  labels: {
    description: "conversational",
    gender: "male",
    age: "young",
    accent: "british-essex",
    use_case: "video games",
  },
  preview_url:
    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CYw3kZ02Hs0563khs1Fj/872cb056-45d3-419e-b5c6-de2b387a93a0.mp3",
};

export default function WarmStart() {
  const [, setVoices] = useAtom(voicesAtom);

  useEffect(() => {
    const warmUpAPI = async (route: string) => {
      try {
        const response = await fetch(`/api/${route}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Warmup": "true",
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          console.warn(`Failed to warm up ${route} API`);
        }
      } catch (error) {
        console.error(`Error warming up ${route} API:`, error);
      }
    };

    const warmUpAllAPIs = async () => {
      await Promise.all(API_ROUTES.map(warmUpAPI));
    };

    warmUpAllAPIs();

    const intervalId = setInterval(warmUpAllAPIs, 10 * 1000); // Run every 10 seconds to prevent API from going cold

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    async function fetchVoices() {
      try {
        const response = await fetch("/api/voices");
        if (!response.ok) {
          throw new Error("Failed to fetch voices");
        }
        const data = await response.json();

        setVoices([...data, DAVE_DATA]);
      } catch (error) {
        console.error("Error fetching voices:", error);
      }
    }

    fetchVoices();
  }, [setVoices]);

  return null;
}
