'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trackSignupClicked } from '@/lib/analytics';

type Integration = {
  name: string;
  slug: string;
  brandColor: string;
  borderGradient: string;
};

type Testimonial = {
  quote: string;
  name: string;
  handle: string;
  tweetUrl?: string;
};

type TrustedLogo = {
  src: string;
  alt: string;
  height: number;
};

const integrations: Integration[] = [
  {
    name: 'Gmail',
    slug: 'gmail',
    brandColor: '#EA4335',
    borderGradient: 'linear-gradient(180deg, rgba(234,67,53,0.95) 0%, rgba(251,188,5,0.75) 100%)',
  },
  {
    name: 'GitHub',
    slug: 'github',
    brandColor: '#6e7681',
    borderGradient: 'linear-gradient(210deg, rgba(255,255,255,0.82), rgba(110,118,129,0.85))',
  },
  {
    name: 'Notion',
    slug: 'notion',
    brandColor: '#ffffff',
    borderGradient: 'linear-gradient(210deg, rgba(255,255,255,0.9), rgba(161,161,170,0.65))',
  },
  {
    name: 'Slack',
    slug: 'slack',
    brandColor: '#E01E5A',
    borderGradient:
      'conic-gradient(from var(--border-angle, 130deg), rgba(224,30,90,0.96), rgba(236,178,46,0.92), rgba(46,182,125,0.9), rgba(54,197,240,0.9), rgba(224,30,90,0.96))',
  },
  {
    name: 'Stripe',
    slug: 'stripe',
    brandColor: '#635BFF',
    borderGradient: 'linear-gradient(175deg, rgba(99,91,255,0.95), rgba(139,92,246,0.76))',
  },
  {
    name: 'HubSpot',
    slug: 'hubspot',
    brandColor: '#FF7A59',
    borderGradient: 'linear-gradient(170deg, rgba(255,122,89,0.96), rgba(249,115,22,0.75))',
  },
  {
    name: 'Google Calendar',
    slug: 'googlecalendar',
    brandColor: '#4285F4',
    borderGradient: 'linear-gradient(330deg, rgba(66,133,244,0.92), rgba(52,168,83,0.75))',
  },
  {
    name: 'Google Drive',
    slug: 'googledrive',
    brandColor: '#4285F4',
    borderGradient:
      'conic-gradient(from var(--border-angle, 140deg), rgba(66,133,244,0.95), rgba(52,168,83,0.92), rgba(251,188,5,0.9), rgba(234,67,53,0.9), rgba(66,133,244,0.95))',
  },
  {
    name: 'Figma',
    slug: 'figma',
    brandColor: '#F24E1E',
    borderGradient:
      'conic-gradient(from var(--border-angle, 120deg), rgba(242,78,30,0.95), rgba(162,89,255,0.93), rgba(10,207,131,0.92), rgba(26,188,254,0.9), rgba(255,114,98,0.92), rgba(242,78,30,0.95))',
  },
  {
    name: 'Linear',
    slug: 'linear',
    brandColor: '#5E6AD2',
    borderGradient: 'linear-gradient(220deg, rgba(148,163,184,0.82), rgba(94,106,210,0.82))',
  },
  {
    name: 'Jira',
    slug: 'jira',
    brandColor: '#0052CC',
    borderGradient: 'linear-gradient(165deg, rgba(0,82,204,0.95), rgba(59,130,246,0.72))',
  },
  {
    name: 'Discord',
    slug: 'discord',
    brandColor: '#5865F2',
    borderGradient: 'linear-gradient(175deg, rgba(88,101,242,0.95), rgba(59,130,246,0.76))',
  },
];

const testimonials: Testimonial[] = [
  {
    quote:
      'Setup @openclaw yesterday. All I have to say is, wow. The fact that claw can just keep building upon itself just by talking to it in discord is crazy. The future is already here.',
    name: 'Jonah',
    handle: '@jonahships_',
    tweetUrl: 'https://x.com/jonahships_/status/2010605025844723765',
  },
  {
    quote:
      'After years of AI hype, I thought nothing could faze me. Then I installed @openclaw. From nervous hi what can you do? to full throttle design, code review, taxes, PM, and content pipelines. AI as teammate, not tool.',
    name: 'Lyc',
    handle: '@lycfyi',
    tweetUrl: 'https://x.com/lycfyi/status/2014513697557758002',
  },
  {
    quote: 'This is the first time I have felt like I am living in the future since the launch of ChatGPT.',
    name: 'Dave Morin',
    handle: '@davemorin',
    tweetUrl: 'https://x.com/davemorin/status/2013723700668096605',
  },
  {
    quote:
      'Very impressed how many hard things Claw gets right. Persistent memory, persona onboarding, comms integration, heartbeats. The end result is AWESOME.',
    name: 'Aryeh Dubois',
    handle: '@AryehDubois',
    tweetUrl: 'https://x.com/AryehDubois/status/2011742378655432791',
  },
  {
    quote:
      'Yeah this was 1,000% worth it. Autonomously running tests on my app, capturing errors through a sentry webhook, then resolving them and opening PRs. The future is here.',
    name: 'Nat Eliason',
    handle: '@nateliason',
    tweetUrl: 'https://x.com/nateliason/status/2013725082850414592',
  },
  {
    quote: 'OpenClaw is the first software in ages for which I constantly check for new releases on GitHub.',
    name: 'Christoph Nakazawa',
    handle: '@cnakazawa',
    tweetUrl: 'https://x.com/cnakazawa/status/2014145277465432519',
  },
  {
    quote: 'When you experience @openclaw it gives the same kick as when we first saw ChatGPT. A fundamental shift is happening.',
    name: 'Abhi Katiyar',
    handle: '@abhi__katiyar',
    tweetUrl: 'https://x.com/abhi__katiyar/status/2014187653600526474',
  },
  {
    quote: 'The most impactful piece of technology I have used since the smartphone.',
    name: 'Alex Finn',
    handle: '@AlexFinn',
  },
  {
    quote: 'This is genuinely impressive. It just works.',
    name: 'Pieter Levels',
    handle: '@levelsio',
  },
  {
    quote: "It's running my company.",
    name: 'Therno',
    handle: '@therno',
  },
  {
    quote: "@openclaw feels like that kind of 'just had to glue all the parts together' leap forward. Incredible experience.",
    name: 'Mark Jaquith',
    handle: '@markjaquith',
    tweetUrl: 'https://x.com/markjaquith/status/2010430366944055433',
  },
  {
    quote:
      'A smart model with eyes and hands at a desk with keyboard and mouse. You message it like a coworker and it does everything a person could do with that Mac mini.',
    name: 'Nathan Clark',
    handle: '@nathanclark_',
    tweetUrl: 'https://x.com/nathanclark_/status/2014647048612773912',
  },
  {
    quote:
      "Your context and skills live on YOUR computer, not a walled garden. It's open source, community-built, and incredibly proactive.",
    name: 'Dan Peguine',
    handle: '@danpeguine',
    tweetUrl: 'https://x.com/danpeguine/status/2014760164113477700',
  },
];

const trustedLogos: TrustedLogo[] = [
  { src: '/logos/trusted/google.svg', alt: 'Google', height: 22 },
  { src: '/logos/trusted/meta.svg', alt: 'Meta', height: 20 },
  { src: '/logos/trusted/openai.svg', alt: 'OpenAI', height: 20 },
  { src: '/logos/trusted/anthropic.svg', alt: 'Anthropic', height: 16 },
  { src: '/logos/trusted/stripe.svg', alt: 'Stripe', height: 22 },
  { src: '/logos/trusted/vercel.svg', alt: 'Vercel', height: 18 },
];

function getLogoUrl(slug: string) {
  return `https://logos.composio.dev/api/${slug}`;
}

export default function Home() {
  const [selectedModel, setSelectedModel] = useState('Claude Opus 4.6');
  const [selectedChannel, setSelectedChannel] = useState('Telegram');

  const useCases = useMemo(
    () => [
      ['Translate in real time', 'Organize your inbox', 'Answer support tickets', 'Summarize long documents', 'Notify before a meeting', 'Auto-reply to messages', 'Draft follow-up emails'],
      ['Schedule across time zones', 'Do your taxes', 'Track expenses and receipts', 'Compare insurance quotes', 'Manage subscriptions', 'Set smart reminders', 'Automate data entry'],
      ['Find discount codes', 'Price-drop alerts', 'Compare product specs', 'Negotiate deals', 'Run payroll calculations', 'Monitor competitor pricing', 'Track order shipments'],
    ],
    [],
  );

  return (
    <div className="bg-gray-50 text-gray-800">
      <style jsx global>{`
        .hero-gradient-orb { position: absolute; border-radius: 9999px; filter: blur(100px); opacity: 0.3; }
        .orb-1 { width: 400px; height: 400px; background: #8b5cf6; top: -100px; left: -150px; animation: pulse-orb 10s infinite alternate; }
        .orb-2 { width: 350px; height: 350px; background: #22d3ee; top: 50%; left: 50%; transform: translate(-50%, -50%); animation: pulse-orb 12s infinite alternate-reverse; }
        .orb-3 { width: 300px; height: 300px; background: #ec4899; bottom: -120px; right: -100px; animation: pulse-orb 8s infinite alternate; }
        @keyframes pulse-orb { 0% { transform: scale(0.9); } 100% { transform: scale(1.1); } }
        @keyframes marquee-left { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes marquee-right { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
        .animate-marquee-left { animation: marquee-left 35s linear infinite; }
        .animate-marquee-right { animation: marquee-right 35s linear infinite; }
        .pill { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem; border: 1px dashed #0a0a0a; font-size: .875rem; white-space: nowrap; }
        .testimonial-grid { column-count: 1; column-gap: 1rem; }
        @media (min-width: 768px) {
          .testimonial-grid { column-count: 2; }
        }
        @media (min-width: 1200px) {
          .testimonial-grid { column-count: 3; }
        }
        .testimonial-card { break-inside: avoid-column; margin-bottom: 1rem; }
        .toolkit-card .border-glow { animation: none; }
        @media (hover: none) {
          .toolkit-card .border-glow { animation: mobileGlowPulse 2.8s ease-in-out infinite; }
        }
        @keyframes mobileGlowPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.34; }
        }
      `}</style>

      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id="toolkit-blur">
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>
      </svg>

      <header className="relative overflow-hidden bg-[#0A0A0A] text-white">
        <div className="absolute inset-0">
          <div className="hero-gradient-orb orb-1" />
          <div className="hero-gradient-orb orb-2" />
          <div className="hero-gradient-orb orb-3" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-28 text-center md:py-40">
          <Image src="/openclaw.svg" alt="OpenClaws" width={96} height={96} className="mx-auto mb-6" priority />
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">Connect All Your Tools<span className="block text-gray-400">In Under 1 Minute</span></h1>
          <p className="mx-auto mb-8 max-w-3xl text-base md:text-lg">Your own 24/7 AI assistant with 1000+ integrations. Powered by OpenClaws.</p>
          <div className="mb-8 flex flex-wrap items-center justify-center gap-3 md:gap-4">
            <Image src="/logos/powered/claude.svg" alt="Claude" width={18} height={18} />
            <Image src="/logos/powered/chatgpt.svg" alt="ChatGPT" width={18} height={18} />
            <Image src="/logos/powered/gemini.png" alt="Gemini" width={18} height={18} />
          </div>
          <Link href="/login" onClick={() => trackSignupClicked('hero')} className="inline-flex items-center rounded-md bg-[#DC2626] px-8 py-3 font-semibold hover:bg-red-700">Get Started</Link>
        </div>
      </header>

      <main>
        <section className="border-b border-gray-200 bg-white py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm sm:p-8">
              <h2 className="mb-3 text-xl font-semibold text-gray-900 sm:text-2xl">Choose Your Model</h2>
              <div className="space-y-3">
                {[
                  { name: 'Claude Opus 4.6', disabled: false },
                  { name: 'Claude Sonnet 4.6', disabled: false },
                  { name: 'GPT-5.3', disabled: false },
                  { name: 'GPT-5.4', disabled: true },
                ].map((model) => (
                  <button
                    key={model.name}
                    onClick={() => !model.disabled && setSelectedModel(model.name)}
                    disabled={model.disabled}
                    className={`w-full rounded-xl border p-4 text-left ${
                      model.disabled
                        ? 'cursor-default border-gray-100 bg-gray-50/40 opacity-50'
                        : selectedModel === model.name
                          ? 'border-gray-900 bg-white'
                          : 'border-gray-200 bg-white/60'
                    }`}
                  >
                    <p className="font-semibold">
                      {model.name}
                      {model.disabled && <span className="ml-2 text-xs font-normal text-gray-400">Coming Soon</span>}
                    </p>
                  </button>
                ))}
              </div>
              <h3 className="mb-3 mt-8 text-lg font-semibold text-gray-900">Connect Your Channel</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {['Telegram', 'Discord', 'WhatsApp'].map((channel) => (
                  <button key={channel} onClick={() => setSelectedChannel(channel)} className={`rounded-lg border px-4 py-3 text-sm font-medium ${selectedChannel === channel ? 'border-gray-900 bg-white' : 'border-gray-200 bg-white/60'}`}>
                    {channel}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-2 text-2xl font-semibold text-gray-900">OpenClaws Pro</h2>
              <div className="mb-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">$29</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="mb-6 space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-600">&#10003;</span>Your own dedicated AI gateway</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-600">&#10003;</span>1,000+ tool integrations via Composio</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-600">&#10003;</span>Persistent memory &amp; conversations</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-600">&#10003;</span>BYO API keys or use managed access</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-600">&#10003;</span>Telegram, Discord &amp; WhatsApp channels</li>
              </ul>
              <Link href="/login" onClick={() => trackSignupClicked('pricing')} className="block w-full rounded-lg bg-[#DC2626] px-6 py-3.5 text-center text-base font-semibold text-white hover:bg-red-700">
                Get Started
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-white/95 select-none">
          <div className="mx-auto max-w-6xl px-4 py-8 text-center">
            <p className="mb-5 text-xs uppercase tracking-wider text-gray-400/70">Trusted by teams at</p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
              {trustedLogos.map((logo) => (
                <img
                  key={logo.alt}
                  src={logo.src}
                  alt={logo.alt}
                  className="grayscale opacity-40 transition-all duration-300 hover:opacity-70 hover:grayscale-0"
                  style={{ height: `${logo.height}px` }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#111111] py-20 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-bold md:text-4xl">1000+ Integrations</h2>
              <p className="text-sm text-zinc-400">+ 985 more</p>
            </div>

            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-6">
              {integrations.map((item) => {
                const logoUrl = getLogoUrl(item.slug);

                return (
                  <article
                    key={item.slug}
                    className="toolkit-card group relative aspect-square cursor-pointer rounded-[22px] border border-white/[0.08] bg-[#111111]/60 bg-clip-padding backdrop-blur-[2px] outline outline-1 outline-white/[0.04] transition-all duration-300 hover:border-white/[0.2] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:scale-[0.98]"
                    style={{
                      containerType: 'size',
                      ['--pointer-x' as string]: 0,
                      ['--pointer-y' as string]: 0,
                      ['--border-angle' as string]: '130deg',
                    }}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = (e.clientX - rect.left) / rect.width;
                      const y = (e.clientY - rect.top) / rect.height;

                      const centeredX = (x - 0.5) * 2;
                      const centeredY = (y - 0.5) * 2;
                      const angle = Math.atan2(centeredY, centeredX) * (180 / Math.PI) + 180;

                      e.currentTarget.style.setProperty('--pointer-x', centeredX.toString());
                      e.currentTarget.style.setProperty('--pointer-y', centeredY.toString());
                      e.currentTarget.style.setProperty('--border-angle', `${angle.toFixed(2)}deg`);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.setProperty('--pointer-x', '0');
                      e.currentTarget.style.setProperty('--pointer-y', '0');
                      e.currentTarget.style.setProperty('--border-angle', '130deg');
                    }}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-[22px] [clip-path:inset(0_round_22px)]">
                      <div
                        className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-[0.25] will-change-transform"
                        style={{
                          filter: "url('#toolkit-blur') saturate(5) brightness(1.3)",
                          translate: 'calc(var(--pointer-x, -10) * 50cqi) calc(var(--pointer-y, -10) * 50cqh)',
                          scale: '3.6',
                        }}
                      >
                        <img alt="" className="h-16 w-16" draggable={false} src={logoUrl} />
                      </div>

                      <div className="relative z-[2] flex h-full flex-col items-center justify-center gap-2.5 p-5">
                        <img alt="App logo" className="h-12 w-12 select-none" draggable={false} src={logoUrl} />
                        <h3 className="select-none text-[13px] font-bold tracking-tight text-white/90">{item.name}</h3>
                      </div>
                    </div>

                    <div
                      className="border-glow pointer-events-none absolute inset-0 z-[3] rounded-[22px] opacity-0 transition-opacity duration-300 group-hover:opacity-[0.46]"
                      style={{
                        border: '1.5px solid transparent',
                        background: item.borderGradient,
                        maskImage: 'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)',
                        maskOrigin: 'border-box, padding-box',
                        maskClip: 'border-box, padding-box',
                        maskComposite: 'exclude',
                        WebkitMaskImage: 'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)',
                        WebkitMaskOrigin: 'border-box, padding-box',
                        WebkitMaskClip: 'border-box, padding-box',
                        WebkitMaskComposite: 'xor',
                        filter: `drop-shadow(0 0 15px ${item.brandColor}66)`,
                      }}
                    />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-[#080808] py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                Testimonials
              </span>
              <h2 className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">Loved by builders everywhere</h2>
              <p className="mt-4 text-lg text-zinc-400">What builders are saying about OpenClaws.</p>
            </div>

            <div className="testimonial-grid mt-16">
              {testimonials.map((testimonial) => (
                <article
                  key={`${testimonial.handle}-${testimonial.name}`}
                  className="testimonial-card group relative rounded-[22px] border border-white/10 bg-[#111111]/50 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-[#161616]/80"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <img
                          src={`https://unavatar.io/x/${testimonial.handle.slice(1)}`}
                          alt={testimonial.name}
                          className="h-11 w-11 rounded-full border border-white/10 object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                        />
                      </div>
                      <div className="leading-tight">
                        <p className="text-[15px] font-bold tracking-tight text-white">{testimonial.name}</p>
                        <p className="text-[13px] font-medium text-zinc-500">{testimonial.handle}</p>
                      </div>
                    </div>

                    {testimonial.tweetUrl ? (
                      <a href={testimonial.tweetUrl} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-colors group-hover:text-white hover:bg-white/10">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                          <path d="M18.9 2h3l-6.7 7.7L23 22h-6.1l-4.8-6.3L6.6 22h-3l7.2-8.3L1 2h6.2l4.3 5.8L18.9 2Zm-1 18h1.7L6.3 3.9H4.5L17.9 20Z" />
                        </svg>
                      </a>
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-colors group-hover:text-white">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                          <path d="M18.9 2h3l-6.7 7.7L23 22h-6.1l-4.8-6.3L6.6 22h-3l7.2-8.3L1 2h6.2l4.3 5.8L18.9 2Zm-1 18h1.7L6.3 3.9H4.5L17.9 20Z" />
                        </svg>
                      </span>
                    )}
                  </div>

                  <p className="text-[16px] leading-[1.6] font-medium text-zinc-300 group-hover:text-zinc-200 transition-colors">&ldquo;{testimonial.quote}&rdquo;</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-5xl space-y-1">
            {useCases.map((row, idx) => (
              <div key={idx} className="relative overflow-hidden py-1.5">
                <div className={`flex w-max gap-3 ${idx % 2 ? 'animate-marquee-right' : 'animate-marquee-left'}`}>
                  {[...row, ...row].map((txt, i) => <span key={`${txt}-${i}`} className="pill">{txt}</span>)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <img src="/openclaw.svg" alt="OpenClaws" className="h-5 w-5" />
              <span className="text-sm font-semibold text-gray-900">OpenClaws</span>
              <a href="https://bearified.co" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600">by Bearified</a>
            </div>
            <nav className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
              <Link href="/docs" className="hover:text-gray-900">Docs</Link>
              <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-900">Terms</Link>
              <a href="https://discord.gg/bearified" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">Discord</a>
              <a href="https://x.com/openclaws" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">X / Twitter</a>
            </nav>
          </div>
          <p className="mt-8 text-center text-xs text-gray-400">&copy; 2026 <a href="https://bearified.co" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">Bearified</a>. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
