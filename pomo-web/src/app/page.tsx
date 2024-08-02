import Pomo from "@/components/pomo";
import WarmStart from "@/components/warmstart";

export default function Home() {
  return (
    <>
      <WarmStart />
      <main className="flex min-h-screen flex-col items-center justify-between p-12">
        <Pomo />
      </main>
    </>
  );
}
