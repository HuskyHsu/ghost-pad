import React from "react";
import logoAwakeUrl from "../../../docs/assets/logo-awake.svg";
import logoSleepyUrl from "../../../docs/assets/logo-sleepy.svg";

interface GhostPadLogoProps {
  className?: string;
  active?: boolean;
  muted?: boolean;
}

/**
 * Shared Ghost-Pad brand mark powered by the standalone pure-CSS animated
 * SVG assets in docs/assets/ (logo-awake.svg & logo-sleepy.svg).
 * Rendering via <img> isolates SVG internal gradient/filter IDs and preserves
 * native CSS animations across all instances.
 */
export const GhostPadLogo: React.FC<GhostPadLogoProps> = ({
  className = "w-full h-full",
  active = false,
  muted = false,
}) => {
  return (
    <img
      src={muted ? logoSleepyUrl : logoAwakeUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      data-muted={muted ? "true" : "false"}
      data-active={active ? "true" : "false"}
      className={`select-none object-contain ${className}`}
    />
  );
};
