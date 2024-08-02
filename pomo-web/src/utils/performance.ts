let lastLogTime = Date.now();
let counts: { [key: string]: number } = {
  llm1: 1,
  llm2: 1,
  audio: 1,
  tts1: 1,
  tts2: 1,
  vadEnd: 1,
  any: 10000,
};

let continueVAD = true;
let startTime = Date.now();
let now = Date.now();

// using to measure the latency for the first speech
export function log(message: string, key: string) {
  if (!counts[key]) {
    return;
  } else if (counts[key] === 0) {
    return;
  } else if (key === "any" && !continueVAD) {
    return;
  }
  if (key !== "any") {
    continueVAD = false;
  }

  if (key === "vadEnd") {
    startTime = now;
  }

  now = Date.now();
  const timeSinceLast = now - lastLogTime;
  const totalTime = now - startTime;

  if (key !== "vadEnd") {
    console.log(`[${totalTime}ms | +${timeSinceLast}ms] ${message}`);
  }

  lastLogTime = now;
  counts[key] -= 1;
}
