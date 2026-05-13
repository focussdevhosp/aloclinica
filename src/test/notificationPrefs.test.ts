import { describe, it, expect, beforeEach } from "vitest";
import { isNotifAllowed, loadNotifPrefs, NOTIF_PREFS_KEY } from "@/lib/notificationPrefs";

describe("notificationPrefs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loadNotifPrefs", () => {
    it("returns defaults when nothing saved", () => {
      const p = loadNotifPrefs();
      expect(p.appointment).toBe(true);
      expect(p.health).toBe(false);
    });

    it("merges defaults with stored prefs", () => {
      localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ health: true, payment: false }));
      const p = loadNotifPrefs();
      expect(p.health).toBe(true);
      expect(p.payment).toBe(false);
      expect(p.appointment).toBe(true);
    });

    it("survives malformed JSON", () => {
      localStorage.setItem(NOTIF_PREFS_KEY, "not-json{{");
      const p = loadNotifPrefs();
      expect(p.appointment).toBe(true);
    });
  });

  describe("isNotifAllowed", () => {
    it("delivers by default for known categories", () => {
      expect(isNotifAllowed("appointment")).toBe(true);
      expect(isNotifAllowed("payment")).toBe(true);
    });

    it("blocks health by default", () => {
      expect(isNotifAllowed("health")).toBe(false);
    });

    it("maps reminder → appointment", () => {
      expect(isNotifAllowed("reminder", { appointment: false })).toBe(false);
      expect(isNotifAllowed("reminder", { appointment: true })).toBe(true);
    });

    it("maps certificate → document", () => {
      expect(isNotifAllowed("certificate", { document: false })).toBe(false);
    });

    it("maps approval and info → system", () => {
      expect(isNotifAllowed("approval", { system: false })).toBe(false);
      expect(isNotifAllowed("info", { system: false })).toBe(false);
    });

    it("maps waitlist → consultation", () => {
      expect(isNotifAllowed("waitlist", { consultation: false })).toBe(false);
    });

    it("delivers unknown categories by default", () => {
      expect(isNotifAllowed("unknown_random_type")).toBe(true);
    });
  });
});
