export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static logLevel: LogLevel = LogLevel.INFO;
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  public static setLogLevel(level: LogLevel): void {
    Logger.logLevel = level;
  }

  public debug(message: string): void {
    if (Logger.logLevel <= LogLevel.DEBUG) {
      console.debug(`[${this.getTimestamp()}] [${this.prefix}] [DEBUG] ${message}`);
    }
  }

  public info(message: string): void {
    if (Logger.logLevel <= LogLevel.INFO) {
      console.info(`[${this.getTimestamp()}] [${this.prefix}] [INFO] ${message}`);
    }
  }

  public warn(message: string): void {
    if (Logger.logLevel <= LogLevel.WARN) {
      console.warn(`[${this.getTimestamp()}] [${this.prefix}] [WARN] ${message}`);
    }
  }

  public error(message: string): void {
    if (Logger.logLevel <= LogLevel.ERROR) {
      console.error(`[${this.getTimestamp()}] [${this.prefix}] [ERROR] ${message}`);
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }
} 