// ============================================
// Reference data — symptoms & MCDA criteria
// ============================================

export const symptoms = [
  { id: 1, name: 'Лихорадка', description: 'Повышенная температура тела' },
  { id: 2, name: 'Кашель', description: 'Сухой или влажный кашель' },
  { id: 3, name: 'Одышка', description: 'Затруднённое дыхание' },
  { id: 4, name: 'Боль в груди', description: 'Боль или давление в области грудной клетки' },
  { id: 5, name: 'Головная боль', description: 'Различной интенсивности' },
  { id: 6, name: 'Тошнота', description: 'Тошнота или рвота' },
  { id: 7, name: 'Слабость', description: 'Общая слабость и утомляемость' },
  { id: 8, name: 'Боль в животе', description: 'Боль в области живота' },
  { id: 9, name: 'Головокружение', description: 'Вестибулярные нарушения' },
  { id: 10, name: 'Потеря сознания', description: 'Кратковременая потеря сознания' },
  { id: 11, name: 'Отёки', description: 'Отёк конечностей или лица' },
  { id: 12, name: 'Судороги', description: 'Непроизвольные мышечные сокращения' },
];

export const criteria = [
  { id: 1, name: 'Давление', description: 'Артериальное давление', weight: 0.25, icon: 'fa-solid fa-heart-pulse' },
  { id: 2, name: 'Температура', description: 'Температура тела', weight: 0.20, icon: 'fa-solid fa-thermometer-half' },
  { id: 3, name: 'Пульс', description: 'Частота пульса', weight: 0.20, icon: 'fa-solid fa-heart-pulse' },
  { id: 4, name: 'Кислород', description: 'Уровень кислорода в крови', weight: 0.20, icon: 'fa-solid fa-lungs' },
  { id: 5, name: 'Симптомы', description: 'Тяжесть симптомов', weight: 0.15, icon: 'fa-solid fa-notes-medical' },
];

export const avatarColors = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#22c55e',
  '#06b6d4', '#ec4899', '#eab308', '#14b8a6', '#6366f1',
];
