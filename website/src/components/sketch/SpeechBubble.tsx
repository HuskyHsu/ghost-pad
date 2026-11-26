import type React from "react";

export interface SpeechBubbleProps {
  children: React.ReactNode;
  tail?: "left" | "bottom" | "top";
  className?: string;
}

export function SpeechBubble({
  children,
  tail = "left",
  className = "",
}: SpeechBubbleProps) {
  return (
    <div
      className={`relative bg-[#FFFFFF] text-[#033157] border-[1.75px] border-[#033157]/20 sketch-corner px-4 py-3 ${className}`}
    >
      <div className="relative z-10">{children}</div>

      {tail === "left" && (
        <svg
          aria-hidden="true"
          width="18"
          height="26"
          viewBox="0 0 18 26"
          fill="none"
          className="pointer-events-none absolute -left-[15px] top-1/2 -translate-y-1/2"
        >
          <path
            d="M17 3.5 L17 22.5 L14.1 21.5 C9.5 18.5 6 16 3.2 13.5 Q1.6 11.8 3.5 10.5 C7 8.8 10.5 7 14.1 4 Z"
            fill="#FFFFFF"
          />
          <path
            d="M14.1 4 C10.5 7 7 8.8 3.5 10.5 Q1.6 11.8 3.2 13.5 C6 16 9.5 18.5 14.1 21.5"
            stroke="#033157"
            strokeOpacity="0.2"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {tail === "bottom" && (
        <svg
          aria-hidden="true"
          width="28"
          height="18"
          viewBox="0 0 28 18"
          fill="none"
          className="pointer-events-none absolute -bottom-[15px] left-1/2 -translate-x-1/2"
        >
          <path
            d="M3.5 1 L23 1 L22 3.9 C19 8.5 16.5 12 13.5 14.8 Q11.8 16.4 10.5 14.5 C8.8 11 7 7.5 4 3.9 Z"
            fill="#FFFFFF"
          />
          <path
            d="M4 3.9 C7 7.5 8.8 11 10.5 14.5 Q11.8 16.4 13.5 14.8 C16.5 12 19 8.5 22 3.9"
            stroke="#033157"
            strokeOpacity="0.2"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {tail === "top" && (
        <svg
          aria-hidden="true"
          width="28"
          height="18"
          viewBox="0 0 28 18"
          fill="none"
          className="pointer-events-none absolute -top-[15px] left-1/2 -translate-x-1/2"
        >
          <path
            d="M3.5 17 L23 17 L22 14.1 C19 9.5 16.5 6 13.5 3.2 Q11.8 1.6 10.5 3.5 C8.8 7 7 10.5 4 14.1 Z"
            fill="#FFFFFF"
          />
          <path
            d="M4 14.1 C7 10.5 8.8 7 10.5 3.5 Q11.8 1.6 13.5 3.2 C16.5 6 19 9.5 22 14.1"
            stroke="#033157"
            strokeOpacity="0.2"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
