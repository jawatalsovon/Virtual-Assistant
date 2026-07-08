import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Image generation
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)',
        }}
      >
        <div
          style={{
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fbcfe8, #c4b5fd, #93c5fd)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 20px 40px rgba(139, 92, 246, 0.2)',
          }}
        >
          <div style={{ display: 'flex', gap: '20px' }}>
            <div
              style={{
                width: '18px',
                height: '42px',
                background: 'white',
                borderRadius: '10px',
              }}
            />
            <div
              style={{
                width: '18px',
                height: '42px',
                background: 'white',
                borderRadius: '10px',
              }}
            />
          </div>
        </div>
        
        <div
          style={{
            marginTop: '40px',
            fontSize: '64px',
            fontWeight: 'bold',
            color: '#1e293b',
            fontFamily: 'sans-serif',
          }}
        >
          Nova AI Assistant
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
