export class SalvationArmyAuthError extends Error {
  constructor(message = 'Salvation Army authentication failed') {
    super(message);
    this.name = 'SalvationArmyAuthError';
  }
}

export class SalvationArmyFetchError extends Error {
  constructor(message = 'Unable to fetch Salvation Army invoices') {
    super(message);
    this.name = 'SalvationArmyFetchError';
  }
}
