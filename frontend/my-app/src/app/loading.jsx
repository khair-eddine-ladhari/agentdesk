// app/loading.js

const PURPLE = "#8A05FF";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white">
      <div
        className="h-8 w-8 animate-spin border-2 border-gray-200"
        style={{ borderTopColor: PURPLE }}
      ></div>
      <p className="font-mono text-[11px] uppercase tracking-wide text-gray-400">
        Loading
      </p>
    </div>
  );
}