export interface FieldError {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: FieldError[];
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 400, errors?: FieldError[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors?: FieldError[]): AppError {
    return new AppError(message, 400, errors);
  }

  static notFound(message: string = "Resource not found"): AppError {
    return new AppError(message, 404);
  }

  static unprocessableEntity(message: string = "Validation failed", errors?: FieldError[]): AppError {
    return new AppError(message, 422, errors);
  }

  static conflict(message: string = "Resource already exists", errors?: FieldError[]): AppError {
    return new AppError(message, 409, errors);
  }

  static unauthorized(message: string = "Authentication required"): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message: string = "Access denied", errors?: FieldError[]): AppError {
    return new AppError(message, 403, errors);
  }

  static internal(message: string = "Internal server error"): AppError {
    return new AppError(message, 500);
  }
}
