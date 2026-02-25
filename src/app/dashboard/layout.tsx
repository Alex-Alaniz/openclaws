'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import type { ReactElement, SVGProps } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
};

function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ToolkitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path
        d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm7.94-2.5-.84.48a.63.63 0 0 0-.31.54.63.63 0 0 0 .31.54l.84.48a.63.63 0 0 1 .27.84l-.93 1.62a.63.63 0 0 1-.8.26l-.86-.34a.64.64 0 0 0-.73.14.64.64 0 0 0-.16.71l.17.92a.64.64 0 0 1-.53.73l-1.84.31a.64.64 0 0 1-.71-.47l-.26-.88a.64.64 0 0 0-.62-.46.64.64 0 0 0-.62.46l-.26.88a.64.64 0 0 1-.71.47l-1.84-.31a.64.64 0 0 1-.53-.73l.17-.92a.64.64 0 0 0-.16-.71.64.64 0 0 0-.73-.14l-.86.34a.63.63 0 0 1-.8.26l-.93-1.62a.63.63 0 0 1 .27-.84l.84-.48a.63.63 0 0 0 .31-.54.63.63 0 0 0-.31-.54l-.84-.48a.63.63 0 0 1-.27-.84l.93-1.62a.63.63 0 0 1 .8-.26l.86.34a.64.64 0 0 0 .73-.14.64.64 0 0 0 .16-.71l-.17-.92a.64.64 0 0 1 .53-.73l1.84-.31a.64.64 0 0 1 .71.47l.26.88a.64.64 0 0 0 .62.46.64.64 0 0 0 .62-.46l.26-.88a.64.64 0 0 1 .71-.47l1.84.31a.64.64 0 0 1 .53.73l-.17.92a.64.64 0 0 0 .16.71.64.64 0 0 0 .73.14l.86-.34a.63.63 0 0 1 .8.26l.93 1.62a.63.63 0 0 1-.27.84Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BillingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="M12 3v18M16.5 7.5c0-1.93-1.9-3.5-4.5-3.5s-4.5 1.57-4.5 3.5 1.9 3.5 4.5 3.5 4.5 1.57 4.5 3.5-1.9 3.5-4.5 3.5-4.5-1.57-4.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThemeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="M12 3v18m0 0a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" {...props}>
      <path d="M10 17v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1m4 10 5-5-5-5m5 5h-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Chat', icon: ChatIcon },
  { href: '/dashboard/toolkits', label: 'Toolkits', icon: ToolkitIcon },
  { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <div className="flex h-screen flex-col bg-[#080808] text-white font-sans">
      <header className="border-b border-white/[0.06] bg-[#0A0A0A]/90 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/[0.12] bg-white/[0.04] text-[12px] font-bold tracking-tight text-white transition-all hover:bg-white/[0.08]">
              OC
            </Link>
            <div className="hidden leading-tight sm:block">
              <p className="text-[14px] font-bold tracking-tight text-white">OpenClaws</p>
              <p className="text-[11px] font-bold tracking-wide text-zinc-500 uppercase">by Bearified</p>
            </div>
          </div>

          <nav className="flex items-center gap-2.5">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-10 min-w-[40px] items-center justify-center gap-2.5 rounded-[12px] border px-3.5 text-[13px] font-bold tracking-tight transition-all ${
                    active 
                      ? 'border-white/[0.2] bg-white text-black' 
                      : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white'
                  }`}
                  title={item.label}
                >
                  <Icon className="h-[16px] w-[16px] shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}

            <div className="mx-1 h-5 w-px bg-white/[0.08] hidden xl:block" />

            <Link
              href="/dashboard/settings"
              className="flex h-10 items-center justify-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3.5 text-[13px] font-bold text-zinc-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
              title="Credits"
            >
              <BillingIcon className="h-[16px] w-[16px]" />
              <span>$5.00</span>
            </Link>

            <Link href="https://discord.gg/composio" target="_blank" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white" title="Discord">
              <svg className="h-[16px] w-[16px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </Link>

            <button
              className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
              title="Theme"
            >
              <ThemeIcon className="h-[16px] w-[16px]" />
            </button>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
              title="Logout"
            >
              <LogoutIcon className="h-[16px] w-[16px]" />
            </button>
          </nav>
        </div>
      </header>

      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
