import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'OpenClaws — Connect All Your Tools';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-2px',
          }}
        >
          OpenClaws
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#a1a1aa',
            marginTop: 16,
          }}
        >
          Connect All Your Tools in Under 1 Minute
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 40,
            padding: '12px 24px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
          }}
        >
          <span style={{ color: '#DC2626', fontSize: 20, fontWeight: 600 }}>1,000+ Integrations</span>
          <span style={{ color: '#71717a', fontSize: 20 }}>|</span>
          <span style={{ color: '#a1a1aa', fontSize: 20 }}>24/7 AI Assistant</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
