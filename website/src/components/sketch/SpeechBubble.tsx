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
          width="16"
          height="20"
          viewBox="0 0 16 20"
          fill="none"
          className="pointer-events-none absolute -left-[13px] top-1/2 -translate-y-1/2"
        >
          <path d="M16 2 L3 10.5 L16 18 Z" fill="#FFFFFF" />
          <path
            d="M15 2.5 C10.5 5.2 6.2 8 3 10.5 C6.8 13.2 10.8 15.5 15 17.5"
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
          width="22"
          height="15"
          viewBox="0 0 22 15"
          fill="none"
          className="pointer-events-none absolute -bottom-[12px] left-8"
        >
          <path d="M2 0 L10 12.5 L20 0 Z" fill="#FFFFFF" />
          <path
            d="M2.5 1 C5.2 5.2 7.5 9.2 10 12.5 C13.2 8.8 16.5 4.8 19.5 1"
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
          width="22"
          height="15"
          viewBox="0 0 22 15"
          fill="none"
          className="pointer-events-none absolute -top-[12px] left-8"
        >
          <path d="M2 15 L10 2.5 L20 15 Z" fill="#FFFFFF" />
          <path
            d="M2.5 14 C5.2 9.8 7.5 5.8 10 2.5 C13.2 6.2 16.5 10.2 19.5 14"
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
