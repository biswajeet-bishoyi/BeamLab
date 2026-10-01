import pino from 'pino';

const isBrowser = typeof window !== 'undefined' || typeof process === 'undefined';
const logLevel = (typeof process !== 'undefined' && process?.env?.LOG_LEVEL) || 'info';
const isDev = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development';

export const logger = isBrowser
  ? pino({
      browser: { asObject: true },
      level: logLevel,
    })
  : pino({
      level: logLevel,
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    });
