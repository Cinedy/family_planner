import { ImageResponse } from "next/og"

export const runtime = "edge"

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#111827",
          width: 512,
          height: 512,
          borderRadius: 114,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={282} height={282} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
