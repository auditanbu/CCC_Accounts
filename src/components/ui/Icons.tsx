import type { SVGProps } from "react";

/** Minimal SF-Symbols-flavoured stroke icons. No icon dependency needed. */

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={22}
      height={22}
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3.5 10.4 12 3.8l8.5 6.6" />
    <path d="M5.5 9.4V19a1.4 1.4 0 0 0 1.4 1.4h10.2A1.4 1.4 0 0 0 18.5 19V9.4" />
    <path d="M9.8 20.4v-5.6h4.4v5.6" />
  </Base>
);

export const CricketIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14.6 3.6 20.4 9.4" />
    <path d="m16.9 1.9 5.2 5.2a1.6 1.6 0 0 1 0 2.3l-1 1a1.6 1.6 0 0 1-2.3 0l-5.2-5.2a1.6 1.6 0 0 1 0-2.3l1-1a1.6 1.6 0 0 1 2.3 0Z" />
    <path d="m13 8.3-9.4 9.4a2.3 2.3 0 0 0 3.3 3.3l9.4-9.4" />
  </Base>
);

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.4" y="5" width="17.2" height="16" rx="3.2" />
    <path d="M3.4 9.6h17.2M8.2 3v4M15.8 3v4" />
  </Base>
);

export const PeopleIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9.2" cy="8.2" r="3.6" />
    <path d="M2.8 20.2a6.4 6.4 0 0 1 12.8 0" />
    <path d="M16.4 5.1a3.6 3.6 0 0 1 0 6.9" />
    <path d="M17.6 14.4a6.4 6.4 0 0 1 3.6 5.8" />
  </Base>
);

export const TrophyIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7.4 3.6h9.2v5.2a4.6 4.6 0 0 1-9.2 0Z" />
    <path d="M7.4 5.4H4.6v1.4a3.4 3.4 0 0 0 3.1 3.4" />
    <path d="M16.6 5.4h2.8v1.4a3.4 3.4 0 0 1-3.1 3.4" />
    <path d="M12 13.4v3.6M8.6 20.4h6.8M9.8 17h4.4l.8 3.4H9Z" />
  </Base>
);

export const WalletIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="2.8" y="5.6" width="18.4" height="13.4" rx="3.2" />
    <path d="M2.8 10h18.4" />
    <circle cx="17" cy="14.6" r="1.2" fill="currentColor" stroke="none" />
  </Base>
);

export const PinIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Base>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Base strokeWidth={2.2} width={18} height={18} {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Base>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Base strokeWidth={2.2} width={18} height={18} {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Base>
);

export const ShareIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 15.4V3.6M8.4 7.2 12 3.6l3.6 3.6" />
    <path d="M5.6 12.4v6a2 2 0 0 0 2 2h8.8a2 2 0 0 0 2-2v-6" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base strokeWidth={2.4} {...p}>
    <path d="m5 12.8 4.4 4.4L19 7.6" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.6 6.6h14.8M9.4 6.6V4.8a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2v1.8" />
    <path d="M6.6 6.6 7.5 19a1.8 1.8 0 0 0 1.8 1.6h5.4a1.8 1.8 0 0 0 1.8-1.6l.9-12.4" />
  </Base>
);

export const PencilIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M15.6 4.6 19.4 8.4M4.4 19.6l.9-3.6L16.1 5.2a1.6 1.6 0 0 1 2.3 0l.4.4a1.6 1.6 0 0 1 0 2.3L8 18.7Z" />
  </Base>
);

export const LockIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="4.8" y="10.4" width="14.4" height="10" rx="2.8" />
    <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" />
  </Base>
);

export const StadiumIcon = (p: IconProps) => (
  <Base {...p}>
    <ellipse cx="12" cy="9" rx="9" ry="4.2" />
    <path d="M3 9v5.4c0 2.3 4 4.2 9 4.2s9-1.9 9-4.2V9" />
  </Base>
);

export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4.4" />
    <path d="M12 2.6v2.6M12 18.8v2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M2.6 12h2.6M18.8 12h2.6M4.6 19.4l1.9-1.9M17.5 6.5l1.9-1.9" />
  </Base>
);

export const MoonIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 13.4A8.4 8.4 0 1 1 10.6 4a6.6 6.6 0 0 0 9.4 9.4Z" />
  </Base>
);

export const LogoutIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9.4 20.4H6.2a1.8 1.8 0 0 1-1.8-1.8V5.4a1.8 1.8 0 0 1 1.8-1.8h3.2" />
    <path d="M15.4 16.4 20 12l-4.6-4.4M20 12H9.4" />
  </Base>
);
