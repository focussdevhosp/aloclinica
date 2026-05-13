import { describe, it, expect, vi } from "vitest";
import { explainError, toastError } from "@/lib/errorMessages";

describe("explainError", () => {
  it("returns context-specific fallback for unknown error", () => {
    const r = explainError(new Error("totally random thing"), "agendamento");
    expect(r.title).toMatch(/agendar/i);
  });

  it("recognizes booking conflicts in agendamento context", () => {
    const r = explainError("This slot is already booked", "agendamento");
    expect(r.title).toMatch(/horário/i);
  });

  it("recognizes card declined in pagamento context", () => {
    const r = explainError({ message: "card_declined" }, "pagamento");
    expect(r.title).toMatch(/recusado/i);
  });

  it("recognizes session expired regardless of context", () => {
    const r = explainError("jwt expired", "geral");
    expect(r.title).toMatch(/sessão/i);
  });

  it("returns network error for fetch failures", () => {
    const r = explainError(new Error("network fetch failed"), "geral");
    expect(r.title).toMatch(/conexão/i);
  });

  it("recognizes KYC similarity errors only in kyc context", () => {
    const inKyc = explainError("low similarity score", "kyc");
    expect(inKyc.title).toMatch(/selfie/i);
    const outsideKyc = explainError("low similarity score", "geral");
    expect(outsideKyc.title).not.toMatch(/selfie/i);
  });

  it("handles null and undefined errors", () => {
    expect(explainError(null, "geral").title).toMatch(/algo/i);
    expect(explainError(undefined, "login").title).toMatch(/entrar/i);
  });

  it("extracts message from PostgrestError-like object", () => {
    const r = explainError({ error_description: "invalid credentials" }, "login");
    expect(r.title).toMatch(/incorreto/i);
  });
});

describe("toastError", () => {
  it("calls toast.error with title and description", () => {
    const toast = { error: vi.fn() };
    toastError(toast, new Error("network failed"), "geral");
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/conexão/i),
      expect.objectContaining({ description: expect.any(String) })
    );
  });
});
