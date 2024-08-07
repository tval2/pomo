"use client";

import { useEffect } from "react";

const API_ROUTES = ["chat", "tts", "vad"];

export default function WarmStart() {
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
  }, []);

  return null;
}
