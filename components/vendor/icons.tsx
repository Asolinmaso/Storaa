/** Vendor console icons. No client hooks, so usable from server components too. */


type IconProps = { size?: number };
const svg = (size: number, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Icon = {
  Dashboard: ({ size = 20 }: IconProps) => svg(size, <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  Box: ({ size = 20 }: IconProps) => svg(size, <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></>),
  Network: ({ size = 20 }: IconProps) => svg(size, <><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path d="M12 7.5v4M12 11.5 6.5 17M12 11.5l5.5 5.5" /></>),
  Bag: ({ size = 20 }: IconProps) => svg(size, <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>),
  Pos: ({ size = 20 }: IconProps) => svg(size, <><rect x="4" y="2" width="16" height="20" rx="2" /><rect x="7" y="5" width="10" height="5" rx="1" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" /></>),
  Clock: ({ size = 20 }: IconProps) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  Store: ({ size = 20 }: IconProps) => svg(size, <><path d="M4 7l1-3h14l1 3" /><path d="M4 7a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /><path d="M5 10v10h14V10" /><path d="M9 20v-5h6v5" /></>),
  Shield: ({ size = 20 }: IconProps) => svg(size, <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>),
  Search: ({ size = 18 }: IconProps) => svg(size, <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  Plus: ({ size = 18 }: IconProps) => svg(size, <path d="M12 5v14M5 12h14" />),
  Upload: ({ size = 18 }: IconProps) => svg(size, <><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" /></>),
  Download: ({ size = 18 }: IconProps) => svg(size, <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>),
  Check: ({ size = 16 }: IconProps) => svg(size, <path d="m5 12 5 5 9-10" />),
  X: ({ size = 16 }: IconProps) => svg(size, <path d="M6 6l12 12M18 6 6 18" />),
  Alert: ({ size = 16 }: IconProps) => svg(size, <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>),
  Pin: ({ size = 18 }: IconProps) => svg(size, <><path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  Refresh: ({ size = 16 }: IconProps) => svg(size, <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>),
  Edit: ({ size = 16 }: IconProps) => svg(size, <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>),
  Trash: ({ size = 16 }: IconProps) => svg(size, <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>),
  Key: ({ size = 18 }: IconProps) => svg(size, <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2" /></>),
  Rupee: ({ size = 18 }: IconProps) => svg(size, <><path d="M6 3h12M6 8h12M6 13h3a5 5 0 0 0 0-10" /><path d="m6 13 8.5 8" /></>),
  Trend: ({ size = 18 }: IconProps) => svg(size, <><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></>),
  Link: ({ size = 16 }: IconProps) => svg(size, <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>),
  Phone: ({ size = 15 }: IconProps) => svg(size, <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />),
};

