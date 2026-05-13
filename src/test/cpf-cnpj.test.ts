import { describe, it, expect } from "vitest";
import { validarCPF, formatarCPF } from "@/lib/cpf";
import { validarCNPJ, formatarCNPJ } from "@/lib/cnpj";

describe("cpf", () => {
  describe("validarCPF", () => {
    it("accepts valid CPFs", () => {
      // Known-valid examples
      expect(validarCPF("11144477735")).toBe(true);
      expect(validarCPF("111.444.777-35")).toBe(true);
    });
    it("rejects all-equal digits", () => {
      expect(validarCPF("11111111111")).toBe(false);
      expect(validarCPF("00000000000")).toBe(false);
    });
    it("rejects wrong length", () => {
      expect(validarCPF("123")).toBe(false);
      expect(validarCPF("123456789012")).toBe(false);
    });
    it("rejects bad check digit", () => {
      expect(validarCPF("11144477736")).toBe(false);
    });
  });

  describe("formatarCPF", () => {
    it("formats progressively", () => {
      expect(formatarCPF("123")).toBe("123");
      expect(formatarCPF("123456")).toBe("123.456");
      expect(formatarCPF("123456789")).toBe("123.456.789");
      expect(formatarCPF("12345678901")).toBe("123.456.789-01");
    });
    it("strips non-digits and caps at 11", () => {
      expect(formatarCPF("abc123def456ghi789jkl01mn999")).toBe("123.456.789-01");
    });
  });
});

describe("cnpj", () => {
  describe("validarCNPJ", () => {
    it("accepts a known-valid CNPJ", () => {
      expect(validarCNPJ("11222333000181")).toBe(true);
      expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
    });
    it("rejects all-equal digits", () => {
      expect(validarCNPJ("11111111111111")).toBe(false);
    });
    it("rejects wrong length", () => {
      expect(validarCNPJ("123")).toBe(false);
    });
    it("rejects bad check digit", () => {
      expect(validarCNPJ("11222333000182")).toBe(false);
    });
  });

  describe("formatarCNPJ", () => {
    it("formats progressively", () => {
      expect(formatarCNPJ("11")).toBe("11");
      expect(formatarCNPJ("11222")).toBe("11.222");
      expect(formatarCNPJ("11222333")).toBe("11.222.333");
      expect(formatarCNPJ("112223330001")).toBe("11.222.333/0001");
      expect(formatarCNPJ("11222333000181")).toBe("11.222.333/0001-81");
    });
    it("caps at 14 digits", () => {
      expect(formatarCNPJ("11222333000181999")).toBe("11.222.333/0001-81");
    });
  });
});
