import { describe, it, expect } from "vitest";
import { maskCPF, maskCNPJ, maskPhone, maskEmail, pseudonymize } from "@/lib/maskPII";

describe("maskPII", () => {
  describe("maskCPF", () => {
    it("masks the middle of a valid CPF", () => {
      expect(maskCPF("12345678909")).toBe("123.***.***-09");
      expect(maskCPF("123.456.789-09")).toBe("123.***.***-09");
    });
    it("returns dash for empty/null", () => {
      expect(maskCPF(null)).toBe("—");
      expect(maskCPF("")).toBe("—");
      expect(maskCPF(undefined)).toBe("—");
    });
    it("returns *** for invalid length", () => {
      expect(maskCPF("123")).toBe("***");
    });
  });

  describe("maskCNPJ", () => {
    it("masks middle digits of a CNPJ", () => {
      expect(maskCNPJ("12345678000199")).toBe("12.***.***/****-99");
    });
    it("handles bad input", () => {
      expect(maskCNPJ(null)).toBe("—");
      expect(maskCNPJ("123")).toBe("***");
    });
  });

  describe("maskPhone", () => {
    it("masks 11-digit mobile", () => {
      expect(maskPhone("11999998888")).toBe("(11) ****-8888");
    });
    it("masks 10-digit landline", () => {
      expect(maskPhone("1133338888")).toBe("(11) ****-8888");
    });
    it("returns last 4 for short numbers", () => {
      expect(maskPhone("99998888")).toBe("****8888");
    });
    it("handles null/empty", () => {
      expect(maskPhone(null)).toBe("—");
      expect(maskPhone("")).toBe("—");
    });
  });

  describe("maskEmail", () => {
    it("keeps first letter and domain", () => {
      expect(maskEmail("joao@email.com")).toBe("j***@email.com");
    });
    it("handles single-char local", () => {
      expect(maskEmail("a@x.com")).toBe("*@x.com");
    });
    it("returns *** for invalid email", () => {
      expect(maskEmail("noatsign")).toBe("***");
      expect(maskEmail(null)).toBe("—");
    });
  });

  describe("pseudonymize", () => {
    it("is deterministic for the same input", () => {
      const a = pseudonymize("user-123");
      const b = pseudonymize("user-123");
      expect(a).toBe(b);
    });
    it("differs for different inputs", () => {
      expect(pseudonymize("user-1")).not.toBe(pseudonymize("user-2"));
    });
    it("respects prefix and limits length", () => {
      const v = pseudonymize("hello", "u_");
      expect(v.startsWith("u_")).toBe(true);
      expect(v.length).toBeLessThanOrEqual(8);
    });
    it("returns dash for empty", () => {
      expect(pseudonymize(null)).toBe("—");
    });
  });
});
