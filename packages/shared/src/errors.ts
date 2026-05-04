export class ProviderUnavailableError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly status: "missing_config" | "degraded" | "down" = "down"
  ) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class TradingDisabledError extends Error {
  constructor(message = "Trading is disabled by platform configuration.") {
    super(message);
    this.name = "TradingDisabledError";
  }
}
