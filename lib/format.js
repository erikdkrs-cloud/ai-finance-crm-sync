// Функция форматирования денег
export const fmtMoney = (value, decimals = 2) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num).replace(/,00 ₽| ₽/g, ' ₽'); // Убираем копейки, если они нулевые
};

// ИСПРАВЛЕНО: Функция форматирования процентов
export const fmtPct = (value) => {
  const num = Number(value) || 0;
  // Умножаем на 100 и форматируем
  return `${(num * 100).toFixed(1)}%`.replace('.0%', '%');
};

// Утилита для ограничения уровня риска
export const clampRisk = (risk) => {
  if (risk > 0.75) return 'HIGH';
  if (risk > 0.4) return 'MED';
  return 'LOW';
};

// НОВОЕ: Функция для генерации цвета по названию проекта
export const getProjectColorFromString = (str) => {
  if (!str) return '#2c2c4b'; // Default color
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 60%, 35%)`;
};
