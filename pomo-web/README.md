pomo-web is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

pomo-web requires API keys for [Gemini](https://ai.google.dev/gemini-api), [Eleven Labs](https://elevenlabs.io/app/sign-up), and [Picovoice](https://console.picovoice.ai/login).  To run pomo-web, first create API Keys for each of these and make a .env.local file in this folder that looks like:

```
GOOGLE_GEMINI_API_KEY="<your Gemini API Key>"
ELEVENLABS_API_KEY="<your Eleven Labs API Key>"
PICOVOICE_API_KEY="<your Picovoice API Key>"
```

Next, install the necessary dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

pomo-web will request camera and microphone access, which are necessary to run everything.  Click the "Start Recording" button in the bottom right to begin speaking with Pomo.  Pomo will respond once it detects your voice with some certainty.  Click anything in the image to tell Pomo to start roleplaying as that object.

Pomo uses [MediaPipe's Interactive Segmentation](https://ai.google.dev/edge/mediapipe/solutions/vision/interactive_segmenter/web_js) to segment objects, identifies them with Gemini, and tracks objects with [OpenCV](https://docs.opencv.org/4.x/d4/dee/tutorial_optical_flow.html).

Hover over the left pane to expand it.  There, you can control audio and video options, see Pomo's past responses and what it is roleplaying as, and select different voices for Pomo to use.