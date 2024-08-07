interface TextFeedProps {
  responses: { id: number; text: string }[];
}

function cleanTextDisplayed(text: string): string {
  return text
    .replace(/\n{2,}/g, "\n") // Replace multiple consec \n with 1
    .trim();
}

export default function TextFeed(props: TextFeedProps) {
  return (
    <div className="whitespace-pre-wrap mb-2 p-2">
      <div className="overflow-y-auto max-h-64 flex flex-col-reverse">
        {props.responses
          .map((el) => ({ ...el, text: cleanTextDisplayed(el.text) }))
          .filter((el) => el.text !== "")
          .toReversed()
          .map((response) => (
            <p key={response.id} className="message">
              {response.text}
            </p>
          ))}
      </div>
    </div>
  );
}
