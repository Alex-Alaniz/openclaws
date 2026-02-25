export default function UsagePage() {
  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] text-white">
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
        <h1 className="text-xl font-bold text-zinc-100 md:text-2xl">Usage</h1>

        <section className="rounded-xl border border-white/[0.1] bg-[#151515] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Current Balance</span>
            <span className="text-sm font-semibold text-zinc-100">$5.00</span>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Usage details will appear here after connector and tool execution events are live.
          </p>
        </section>
      </div>
    </div>
  );
}
