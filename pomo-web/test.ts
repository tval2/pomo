const readline = require("readline");
const { PvRecorder } = require("@picovoice/pvrecorder-node");
const {
  Cobra,
  CobraActivationLimitReachedError,
} = require("@picovoice/cobra-node");

let accessKey = "fadmoHEze0NM1H0m3HzRVDZy1AMyE9Ku0WNIKz+jMxeURNWi9Gbj+g==";
if (accessKey === undefined) {
  console.log("No AccessKey provided");
  process.exit();
}

let isInterrupted = false;

async function micDemo() {
  let engineInstance = new Cobra(accessKey);

  const recorder = new PvRecorder(engineInstance.frameLength, -1);
  recorder.start();

  console.log(`Using device: ${recorder.getSelectedDevice()}`);

  console.log("Listening... Press `ENTER` to stop:");

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on("keypress", (key, str) => {
    if (
      str.sequence === "\r" ||
      str.sequence === "\n" ||
      (str.ctrl && str.name === "c")
    ) {
      isInterrupted = true;
    }
  });

  while (!isInterrupted) {
    const pcm = await recorder.read();
    try {
      const voiceProbability = engineInstance.process(pcm);
      const percentage = voiceProbability * 100;
      const barLength = Math.floor((percentage / 10) * 3);
      const emptyLength = 30 - barLength;
      const spacer = ` `.repeat(3 - percentage.toFixed(0).length);

      process.stdout.write(
        `\r[${spacer}${percentage.toFixed(0)}]|${"█".repeat(
          barLength
        )}${" ".repeat(emptyLength)}|`
      );
    } catch (err) {
      if (err instanceof CobraActivationLimitReachedError) {
        console.error(
          `AccessKey '${accessKey}' has reached it's processing limit.`
        );
      } else {
        console.error(err);
      }
      isInterrupted = true;
    }
  }

  recorder.stop();
  recorder.release();
  engineInstance.release();
  process.stdout.write("\n");
  process.exit();
}

micDemo();
