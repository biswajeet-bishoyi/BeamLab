import express, { Request, Response, NextFunction } from 'express';
import { logger, InternalError, AppError } from '@beamlab/utils';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
    });
    return;
  }

  // Unhandled internal errors
  logger.error(err, 'Unhandled Exception');
  const internal = new InternalError();
  res.status(internal.statusCode).json({
    success: false,
    error: internal.errorCode,
    message: internal.message,
  });
}
