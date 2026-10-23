export const colors = {
  primary: '#0E7490',
  primaryDark: '#155E75',
  primarySoft: '#E0F2F7',
  accent: '#06B6D4',
  dealer: '#B45309',
  dealerSoft: '#FEF3C7',
  bg: '#F4F7F9',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  success: '#15803D',
  successSoft: '#DCFCE7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 24 };

export const shadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const statusColors = {
  placed: [colors.info, colors.infoSoft],
  confirmed: [colors.primary, colors.primarySoft],
  shipped: [colors.warning, colors.warningSoft],
  delivered: [colors.success, colors.successSoft],
  cancelled: [colors.danger, colors.dangerSoft],
  open: [colors.info, colors.infoSoft],
  assigned: [colors.primary, colors.primarySoft],
  in_progress: [colors.warning, colors.warningSoft],
  resolved: [colors.success, colors.successSoft],
  pending: [colors.warning, colors.warningSoft],
  approved: [colors.success, colors.successSoft],
  rejected: [colors.danger, colors.dangerSoft],
};
