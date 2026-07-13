export default function DailyChallengeBanner({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="mt-3 rounded-xl border border-indigo-300/70 bg-indigo-50/80 px-4 py-2 text-right">
      <span className="text-xs font-extrabold text-indigo-700">מצב אתגר יומי פעיל</span>
    </div>
  );
}
