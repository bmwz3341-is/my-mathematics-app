import Link from "next/link";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white">
      <div className="flex flex-[1.4] flex-col items-center justify-end gap-4 px-4 pb-40 text-center sm:px-6 sm:pb-44">
        <span className="flex size-28 shrink-0 items-center justify-center gap-1 rounded-2xl bg-blue-600 text-white sm:size-36">
          <DollarSign className="size-14 sm:size-20" strokeWidth={2} />
          <span className="text-5xl font-bold leading-none sm:text-6xl">₪</span>
        </span>
        <h1 className="text-4xl font-extrabold text-orange-500 sm:text-6xl md:text-7xl">
        All-in-One Power Calculator & Converter
        </h1>
      </div>
      <div className="flex flex-1 items-start justify-center px-6 -mt-16 sm:-mt-20">
        <Button
          render={<Link href="/HomePage" />}
          size="lg"
          className="h-16 w-full max-w-sm bg-blue-600 text-2xl hover:bg-blue-700 sm:w-1/3 sm:min-w-[220px]"
        >
          בואו נתחיל
        </Button>
      </div>
    </div>
  );
}
