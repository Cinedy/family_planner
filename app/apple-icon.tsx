import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: "#111827",
        width: 180,
        height: 180,
        borderRadius: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={99} height={99} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </div>,
    { ...size }
  )
}
