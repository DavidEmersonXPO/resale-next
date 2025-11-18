const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export const formatCurrency = (value: string | number) => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  return currencyFormatter.format(numericValue || 0);
};

export const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
