/**
 * Client-side credit card utilities.
 * Validates before hitting the payment API — better UX and reduces unnecessary API calls.
 */

/** Luhn algorithm — validates card number checksum */
export function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/** Returns true when MM/AA expiry is valid and not in the past */
export function validateCardExpiry(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10) + 2000;
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const cardDate = new Date(year, month - 1); // first day of expiry month
  return cardDate >= new Date(now.getFullYear(), now.getMonth());
}

/** Amex needs 4-digit CVV; all others need 3 */
export function validateCvv(cvv: string, cardNumber: string): boolean {
  const digits = cvv.replace(/\D/g, "");
  const cardDigits = cardNumber.replace(/\D/g, "");
  const isAmex = cardDigits.startsWith("34") || cardDigits.startsWith("37");
  return isAmex ? digits.length === 4 : digits.length === 3;
}

/** Returns a human-readable error message or null if everything is valid */
export function validateCard(
  name: string,
  number: string,
  expiry: string,
  cvv: string,
): string | null {
  if (!name.trim() || name.trim().length < 3) return "Nome no cartão inválido";
  if (!luhnCheck(number)) return "Número do cartão inválido";
  if (!validateCardExpiry(expiry)) return "Data de validade inválida ou cartão vencido";
  if (!validateCvv(cvv, number)) return "CVV inválido";
  return null;
}
