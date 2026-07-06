export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: string;

  constructor(message: string, statusCode: number, isOperational = true, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class APIError extends AppError {
  constructor(message = 'Bad Request', errorCode = 'BAD_REQUEST') {
    super(message, 400, true, errorCode);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation Failed', errorCode = 'VALIDATION_ERROR') {
    super(message, 422, true, errorCode);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized', errorCode = 'UNAUTHORIZED') {
    super(message, 401, true, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found', errorCode = 'NOT_FOUND') {
    super(message, 404, true, errorCode);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal Server Error', errorCode = 'INTERNAL_ERROR') {
    super(message, 500, false, errorCode);
  }
}
