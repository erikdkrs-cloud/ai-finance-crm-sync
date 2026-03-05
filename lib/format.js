export const fmtMoney = (value, decimals = 2) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num).replace(/,00 ₽| ₽/g, ' ₽');
};

export const fmtPct = (value) => {
  const num = Number(value) || 0;
  return `${(num * 100).toFixed(1)}%`.replace('.0%', '%');
};

export const clampRisk = (risk) => {
  if (risk > 0.75) return 'HIGH';
  if (risk > 0.4) return 'MED';
  return 'LOW';
};

export const getProjectColorFromString = (str) => {
  if (!str) return '#2c2c4b';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 60%, 35%)`;
};
