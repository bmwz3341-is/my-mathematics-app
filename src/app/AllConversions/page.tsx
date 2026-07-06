import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { conversionsConfig } from "@/config/conversionsConfig";

export default function AllConversions() {
  return (
    <div className="min-h-screen bg-white px-6 py-8 pb-28 sm:px-10">
      <h1 className="text-right text-2xl font-extrabold text-blue-800 sm:text-3xl">
        רשימת ההמרות
      </h1>
      <div className="mt-6 grid grid-cols-4 gap-4">
        {conversionsConfig.map((item) => (
          <Link
            key={item.id}
            href={item.path}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-2 py-4 transition hover:brightness-95 active:brightness-90"
          >
            <span
              className={`flex size-12 items-center justify-center rounded-lg shadow-sm ${item.color}`}
            >
              <item.icon className="size-6 text-white" strokeWidth={2} />
            </span>
            <span className="text-sm font-bold text-black">{item.label}</span>
          </Link>
        ))}
      </div>
      <Link
        href="/HomePage"
        aria-label="חזרה למסך הקודם"
        className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 active:brightness-90"
      >
        <ArrowRight className="size-6" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
