export class GoodwillAuthError extends Error {
  constructor(message = 'Goodwill authentication failed') {
    super(message);
    this.name = 'GoodwillAuthError';
  }
}

export class GoodwillDownloadError extends Error {
  constructor(message = 'Unable to download Goodwill CSV data') {
    super(message);
    this.name = 'GoodwillDownloadError';
  }
}

export class GoodwillConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoodwillConfigurationError';
  }
}
