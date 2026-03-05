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
  const iconButtonBase =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-[8px] text-sm font-medium text-zinc-100 transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#252525] hover:text-white';
  const utilityButtonBase =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] px-2.5 text-sm font-medium text-zinc-100 transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#252525] hover:text-white';
  
  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a] text-white font-sans">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.1] bg-[#111111]/95 px-4 backdrop-blur">
        <div className="flex items-center gap-1.5">
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <img src="/openclaw.svg" alt="OpenClaws" className="h-5 w-5" />
            <div className="relative hidden sm:block">
              <span className="text-xs font-bold leading-tight text-zinc-100">OpenClaws</span>
              <a href="https://bearified.co" target="_blank" rel="noopener noreferrer" className="absolute bottom-0 right-0 translate-y-[80%] text-[8px] text-zinc-500 hover:text-zinc-400">by Bearified</a>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? `${iconButtonBase} bg-[#252525]` : iconButtonBase}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </Link>
              );
            })}
          </nav>

          <Link
            href="/dashboard/usage"
            className={utilityButtonBase}
            title="Credits"
          >
            <BillingIcon className="h-4 w-4" />
            <span>Usage</span>
          </Link>

          <Link href="https://discord.gg/bearified" target="_blank" className={iconButtonBase} title="Discord">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={iconButtonBase}
            title="Logout"
          >
            <LogoutIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
