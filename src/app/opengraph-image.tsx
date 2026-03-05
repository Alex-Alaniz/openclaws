import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'OpenClaws — Connect All Your Tools In Under 1 Minute';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1a0a0a 50%, #0A0A0A 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)',
            transform: 'translateX(-50%)',
          }}
        />

        {/* Top badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            borderRadius: 999,
            border: '1px solid rgba(220,38,38,0.3)',
            background: 'rgba(220,38,38,0.08)',
            marginBottom: 32,
            fontSize: 16,
            color: '#f87171',
            fontWeight: 500,
          }}
        >
          by BearifiedCo
        </div>

        {/* Logo + Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 8,
          }}
        >
          {/* Logo container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 96,
              height: 96,
              borderRadius: 20,
              border: '2px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://openclaws.biz/openclaw.png"
              alt="OpenClaws"
              width={72}
              height={72}
              style={{ borderRadius: 8 }}
            />
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-3px',
              lineHeight: 1,
            }}
          >
            OpenClaws
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: '#d4d4d8',
            marginTop: 16,
            fontWeight: 400,
          }}
        >
          Connect All Your Tools In Under 1 Minute
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ color: '#f87171', fontSize: 22, fontWeight: 700 }}>1,000+</span>
            <span style={{ color: '#a1a1aa', fontSize: 18 }}>Integrations</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ color: '#60a5fa', fontSize: 22, fontWeight: 700 }}>Claude</span>
            <span style={{ color: '#a1a1aa', fontSize: 18 }}>+ GPT-5.3</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ color: '#34d399', fontSize: 22, fontWeight: 700 }}>$29</span>
            <span style={{ color: '#a1a1aa', fontSize: 18 }}>/month</span>
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 18,
            color: '#52525b',
            fontWeight: 500,
          }}
        >
          openclaws.biz
        </div>
      </div>
    ),
    { ...size },
  );
}
