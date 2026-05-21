/* global window */
/* Inline SVG icons matching lucide style (1.5px stroke, currentColor) */

const I = ({ d, size = 16, stroke = 1.5, children, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children || (d ? <path d={d} /> : null)}
  </svg>
);

const Icon = {
  Home: (p) => <I {...p}><path d="M3 9.5 12 3l9 6.5"/><path d="M5 9v11h14V9"/><path d="M10 20v-6h4v6"/></I>,
  Receipt: (p) => <I {...p}><path d="M5 21V3l3 2 3-2 3 2 3-2 3 2v18l-3-2-3 2-3-2-3 2-3-2z"/><path d="M8 9h8"/><path d="M8 13h8"/><path d="M8 17h5"/></I>,
  Utensils: (p) => <I {...p}><path d="M3 2v6a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V2"/><path d="M5 10v12"/><path d="M19 2v20"/><path d="M15 2c0 4 2 4 2 8 0 0 0 1-2 1"/></I>,
  Users: (p) => <I {...p}><circle cx="9" cy="8" r="3"/><path d="M3 21v-1a6 6 0 0 1 12 0v1"/><path d="M16 3.5a3 3 0 0 1 0 6"/><path d="M17 14a6 6 0 0 1 4 6v1"/></I>,
  Tag: (p) => <I {...p}><path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/></I>,
  Calendar: (p) => <I {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></I>,
  Star: (p) => <I {...p}><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.4l6.1-.9z"/></I>,
  FileBar: (p) => <I {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 17v-3M12 17v-5M15 17v-2"/></I>,
  Shield: (p) => <I {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></I>,
  MapPin: (p) => <I {...p}><path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></I>,
  Cog: (p) => <I {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 16.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7.1 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></I>,
  History: (p) => <I {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></I>,
  Inbox: (p) => <I {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></I>,
  Search: (p) => <I {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></I>,
  Bell: (p) => <I {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></I>,
  Chevron: (p) => <I {...p}><path d="m6 9 6 6 6-6"/></I>,
  ChevronR: (p) => <I {...p}><path d="m9 6 6 6-6 6"/></I>,
  Arrow: (p) => <I {...p}><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></I>,
  ArrowUp: (p) => <I {...p}><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></I>,
  ArrowDown: (p) => <I {...p}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></I>,
  Check: (p) => <I {...p}><path d="M20 6 9 17l-5-5"/></I>,
  Truck: (p) => <I {...p}><path d="M1 6h13v10H1z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></I>,
  ChevronsLeft: (p) => <I {...p}><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></I>,
  Plus: (p) => <I {...p}><path d="M12 5v14M5 12h14"/></I>,
  Eye: (p) => <I {...p}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></I>,
};

window.Icon = Icon;
