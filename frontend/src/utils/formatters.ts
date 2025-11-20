const formatterCache = new Map<string, Intl.NumberFormat>();

const getCurrencyFormatter = (currency: string) => {
  if (!formatterCache.has(currency)) {
    formatterCache.set(
      currency,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }),
    );
  }
  return formatterCache.get(currency)!;
};

export const formatCurrency = (value: string | number, currency = 'USD') => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  return getCurrencyFormatter(currency).format(numericValue || 0);
};

export const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
