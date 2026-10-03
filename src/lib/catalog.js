export const TASK_ICONS = ['🍽️', '🧽', '🧺', '👕', '🧹', '🛏️', '🗑️', '🛒', '🍳', '🪴', '🚿', '🦷', '🚶', '🏃', '🏋️', '🚴', '🧘', '🏊', '📚', '✍️', '💻', '🎸', '📞', '🧾', '💧', '🐕', '🌙', '☀️', '🎯', '⭐'];
export const BUSY_ICONS = ['🎓', '💼', '🚌', '📅', '⚽', '🎾', '🏀', '🎂', '🍻', '🎬', '🏥', '👨‍👩‍👧', '✈️', '🎤'];
export const REWARD_ICONS = ['🍕', '🍔', '🍿', '🍦', '☕', '🎮', '🎬', '🎧', '📱', '🛍️', '🏖️', '💆', '🎁', '🍣'];

export const PREFS = [
  { value: 'manana', label: 'Mañana' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noche', label: 'Noche' },
  { value: 'cualquiera', label: 'Cuando haya hueco' }
];
export const PREF_LABEL = Object.fromEntries(PREFS.map(p => [p.value, p.label]));

export const POINT_PRESETS = [
  { value: 5, label: 'Mínima +5' },
  { value: 10, label: 'Sencilla +10' },
  { value: 20, label: 'Media +20' },
  { value: 30, label: 'Exigente +30' },
  { value: 50, label: 'Gran reto +50' }
];

export const FREQS = [
  { value: 'daily', label: 'Cada día' },
  { value: 'interval', label: 'Cada X días' },
  { value: 'weekdays', label: 'Días concretos' },
  { value: 'once', label: 'Una vez' },
  { value: 'anytime', label: 'Sin fecha' }
];
export const REPEATING = ['daily', 'interval', 'weekdays'];

export const DURATIONS = [5, 10, 15, 20, 30, 40, 45, 60, 75, 90, 120];
export const REMINDERS = [
  { value: '', label: 'Sin aviso' },
  { value: 5, label: '5 minutos antes' },
  { value: 10, label: '10 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 día antes' }
];

export const MAX_TASK_TIME = [
  { value: 0, label: 'Sin límite' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 h 30 min' },
  { value: 120, label: '2 horas' },
  { value: 150, label: '2 h 30 min' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' }
];
