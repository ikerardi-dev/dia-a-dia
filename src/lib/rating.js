/** Nota con coma decimal: 7.5 → "7,5" */
export const formatScore = score => score.toLocaleString('es-ES', { maximumFractionDigits: 1 });

/** Tono de color de la nota: 0 = rojo, 10 = verde */
export const scoreHue = score => Math.round(score * 12);

/** Estilo en línea para pintar algo con el color de la nota */
export const scoreStyle = score => ({ '--score-hue': scoreHue(score) });
