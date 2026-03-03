import { UsersIcon, GridIcon, RefreshIcon, TrendingIcon } from '../components/Icons';

export const getRoleLabel = (role) => {
  const map = { setter:'SPE', outside:'PL', middle:'MID', opposite:'DIA', libero:'L' };
  return map[role] || role?.toUpperCase().slice(0,3) || '?';
};

export const TABS = [
  ['players', UsersIcon, 'Spelers'],
  ['lineup', GridIcon, 'Opstelling'],
  ['subs', RefreshIcon, 'Wissels'],
  ['stats', TrendingIcon, 'Stats'],
  ['matches', GridIcon, 'Wedstrijden'],
];

export const shirtColors = { home:'#dc2626', away:'#2563eb', libero:'#475569' };
