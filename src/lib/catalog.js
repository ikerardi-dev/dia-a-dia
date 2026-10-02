export const TASK_ICONS = ['🍽️', '🧽', '🧺', '👕', '🧹', '🛏️', '🗑️', '🛒', '🍳', '🪴', '🚿', '🦷', '🚶', '🏃', '🏋️', '🚴', '🧘', '🏊', '📚', '✍️', '💻', '🎸', '📞', '🧾', '💧', '🐕', '🌙', '☀️', '🎯', '⭐'];
export const BUSY_ICONS = ['🎓', '💼', '🚌', '📅', '⚽', '🏥', '👨‍👩‍👧', '✈️'];
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

export const DURATIONS = [5, 10, 15, 20, 30, 40, 45, 60, 75, 90, 120];
export const BUSY_SUGGESTIONS = ['Clase', 'Bootcamp', 'Trabajo', 'Médico', 'Entrenamiento'];
