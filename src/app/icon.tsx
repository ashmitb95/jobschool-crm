import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          backgroundColor: "#e8622a",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 100 100">
          <polygon points="8,52 22,8 42,44" fill="white" />
          <polygon points="92,52 78,8 58,44" fill="white" />
          <ellipse cx="50" cy="66" rx="38" ry="30" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
