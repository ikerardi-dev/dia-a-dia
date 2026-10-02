export class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export const assert = (condition, code, message) => {
  if (!condition) throw new AppError(code, message);
};
