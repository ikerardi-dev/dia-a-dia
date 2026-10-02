const base = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true
};

export const SunIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const CalendarIcon = () => (
  <svg {...base}><rect x="3" y="4.5" width="18" height="17" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
);
export const ListIcon = () => (
  <svg {...base}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></svg>
);
export const GiftIcon = () => (
  <svg {...base}><rect x="3" y="8" width="18" height="5" rx="1" /><path d="M5 13v8h14v-8M12 8v13M12 8S10.5 3.5 8 4.2C5.8 4.8 7 8 12 8zM12 8s1.5-4.5 4-3.8C18.2 4.8 17 8 12 8z" /></svg>
);
export const MedalIcon = () => (
  <svg {...base}><circle cx="12" cy="9" r="6" /><path d="M8.5 14l-1.5 8 5-3 5 3-1.5-8" /></svg>
);
export const CheckIcon = () => (
  <svg {...base} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
