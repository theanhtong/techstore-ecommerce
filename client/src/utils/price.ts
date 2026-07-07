/**
 * Helper to convert and format prices into Vietnamese Dong (VND)
 * Converts smaller numbers (assumed to be USD seed data) to VND at a rate of 1 USD = 25,000 VND.
 * Keeps larger numbers (already in VND) untouched.
 */
export const formatPrice = (price: number | string | undefined | null): string => {
  if (price === undefined || price === null) return "0 ₫";
  const val = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(val)) return "0 ₫";
  const converted = val < 100000 ? val * 25000 : val;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(converted).replace("₫", "đ"); // standard local styling
};
