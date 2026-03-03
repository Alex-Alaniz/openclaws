import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] text-white">
      <img src="/openclaw.svg" alt="OpenClaws" className="mb-6 h-16 w-16 opacity-30" />
      <h1 className="text-5xl font-bold tracking-tight">404</h1>
      <p className="mt-3 text-lg text-zinc-400">Page not found</p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
