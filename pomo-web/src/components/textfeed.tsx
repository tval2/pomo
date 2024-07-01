interface TextFeedProps {
  responses: { id: number; text: string }[];
}

export default function TextFeed(props: TextFeedProps) {
  return (
    <div className="whitespace-pre-wrap mb-2 p-2">
      <h3>LLM Responses:</h3>
      <div className="overflow-y-auto max-h-64 flex flex-col-reverse">
        {props.responses
          .filter((el) => {
            return el.text.trim() !== "$null$";
          })
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
