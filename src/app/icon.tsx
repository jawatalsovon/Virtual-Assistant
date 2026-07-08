import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #fbcfe8, #c4b5fd, #93c5fd)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '30px' }}>
          <div
            style={{
              width: '40px',
              height: '90px',
              background: 'white',
              borderRadius: '20px',
            }}
          />
          <div
            style={{
              width: '40px',
              height: '90px',
              background: 'white',
              borderRadius: '20px',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
