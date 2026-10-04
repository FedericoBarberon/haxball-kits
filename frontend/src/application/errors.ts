export type AppErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_STATE'
  | 'NETWORK'
  | 'NOT_FOUND'
  | 'STORAGE'
  | 'GAME'

export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(
    code: AppErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AppError'
    this.code = code
  }
}
