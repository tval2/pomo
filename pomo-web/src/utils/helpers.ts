let pendingText = "";

export function isEndOfSentence(text: string) {
  const sentenceEndings = [".", "?", "!"];
  return sentenceEndings.some((ending) => text.includes(ending));
}

export function cleanTextPlayed(text: string): string {
  return text
    .replace(/[\n\r]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[^a-zA-Z0-9\s$#?!.,;:"']/g, "")
    .trim();
}

export function processChunk(chunk: string): string {
  pendingText += chunk;
  let processedText = pendingText.replace(/\$null\$/g, "");

  // Check if the remaining text ends with a partial $null$ sequence
  const lastDollarIndex = processedText.lastIndexOf("$");
  if (lastDollarIndex !== -1 && lastDollarIndex > processedText.length - 5) {
    pendingText = processedText.slice(lastDollarIndex);
    processedText = processedText.slice(0, lastDollarIndex);
  } else {
    pendingText = "";
  }

  return processedText;
}
