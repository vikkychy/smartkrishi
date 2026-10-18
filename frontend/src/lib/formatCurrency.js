const nprFormatter = new Intl.NumberFormat("en-NP", {
  style: "currency",
  currency: "NPR",
  maximumFractionDigits: 2,
});

export function formatNpr(amount) {
  return nprFormatter.format(Number(amount) || 0);
}
