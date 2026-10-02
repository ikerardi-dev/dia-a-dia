export const EXAMPLE_TASKS = [
  { name: 'Fregar los platos', icon: '🍽️', points: 10, freq: { type: 'daily' }, pref: 'noche', duration: 20 },
  { name: 'Poner la lavadora', icon: '🧺', points: 10, freq: { type: 'interval', every: 3 }, pref: 'tarde', duration: 15 },
  { name: 'Salir a dar un paseo', icon: '🚶', points: 20, freq: { type: 'daily' }, pref: 'tarde', duration: 40 },
  { name: 'Ir al gimnasio', icon: '🏋️', points: 30, freq: { type: 'weekdays', days: [1, 3, 5] }, pref: 'tarde', duration: 75 },
  { name: 'Hacer la cama', icon: '🛏️', points: 5, freq: { type: 'daily' }, pref: 'manana', duration: 5 }
];

export const EXAMPLE_REWARDS = [
  { name: 'Tarde de videojuegos', icon: '🎮', cost: 150 },
  { name: 'Pedir pizza', icon: '🍕', cost: 300 },
  { name: 'Darme un capricho', icon: '🛍️', cost: 600 }
];
