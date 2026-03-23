export const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="4" y1="4" x2={size-4} y2={size-4}/><line x1={size-4} y1="4" x2="4" y2={size-4}/>
  </svg>
);
export const ChevronIcon = ({ up }) => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {up ? <polyline points="4,14 10,8 16,14"/> : <polyline points="4,8 10,14 16,8"/>}
  </svg>
);
export const UsersIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="9" cy="6" r="3"/><path d="M3 18c0-3.31 2.69-6 6-6s6 2.69 6 6"/><path d="M15.5 4.5a2.5 2.5 0 0 1 0 5M19 18c0-2.76-1.57-5.13-3.87-6.25"/>
  </svg>
);
export const GridIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="5" height="5"/><rect x="10" y="3" width="5" height="5"/>
    <rect x="3" y="10" width="5" height="5"/><rect x="10" y="10" width="5" height="5"/>
  </svg>
);
export const RefreshIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.51"/>
  </svg>
);
export const TrendingIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/>
  </svg>
);
export const SettingsIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
