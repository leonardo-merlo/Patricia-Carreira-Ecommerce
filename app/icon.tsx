import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Alça */}
          <path
            d="M9 12C9 9 10.8 7 13 7C15.2 7 17 9 17 12"
            stroke="#823b18"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Corpo da bolsa */}
          <rect x="4.5" y="12" width="17" height="11.5" rx="2.5" fill="#823b18" />
          {/* Fecho */}
          <rect x="10" y="15.5" width="6" height="3.5" rx="1.2" fill="#fff8ef" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
