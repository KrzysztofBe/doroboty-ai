import { legacyEvidenceKey } from "./evidence-follow-up";
import { describe, expect, it } from "vitest";
import { initialState } from "./model";
import {
  MAX_IMPORT_BYTES,
  parseState,
  readState,
  saveState,
  serializeState,
  STORAGE_KEY,
} from "./storage";
function memory(raw: string | null = null) {
  const values = new Map(raw === null ? [] : [[STORAGE_KEY, raw]]);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
describe("browser persistence and recovery", () => {
  it("round-trips a complete valid scenario", () => {
    const storage = memory();
    const s = initialState();
    saveState(storage, s);
    expect(readState(storage).state).toEqual(s);
    expect(parseState(serializeState(s))).toEqual(s);
  });
  it("protects incompatible/corrupt original saves", () => {
    for (const raw of ["{", JSON.stringify({ ...initialState(), version: 2 })]) {
      const storage = memory(raw);
      const loaded = readState(storage);
      expect(loaded.blocked).toBe(true);
      expect(loaded.original).toBe(raw);
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    }
  });
  it("does not fail startup when storage access is denied", () => {
    expect(readState(null).state.jobs.length).toBeGreaterThan(0);
    expect(
      readState({
        getItem() {
          throw new Error("Denied");
        },
        setItem() {},
      }).blocked,
    ).toBe(true);
  });
  it("recovers legacy written evidence without reviving it after a reset", () => {
    const storage = memory(JSON.stringify({ ...initialState(), evidence: undefined }));
    storage.setItem(
      legacyEvidenceKey,
      JSON.stringify({
        measurement: { status: "sent", prompt: "Task", reply: { text: "Text", video: true } },
        ownership: { status: "sent", prompt: "Question", reply: { text: "", video: true } },
        discovery: { status: "invalid" },
      }),
    );
    expect(readState(storage).state.evidence).toEqual({
      measurement: { status: "sent", prompt: "Task", reply: { text: "Text" } },
      ownership: { status: "sent", prompt: "Question" },
    });
    saveState(storage, initialState());
    expect(readState(storage).state.evidence).toEqual({});
  });
  it("rejects a write when the tab's stored snapshot is stale", () => {
    const storage = memory();
    const first = readState(storage);
    const second = readState(storage);
    const next = { ...first.state, activePersonId: "candidate-marek" };
    saveState(storage, next, first.persisted);
    expect(() => saveState(storage, second.state, second.persisted)).toThrow("innej karcie");
    expect(readState(storage).state).toEqual(next);
  });
  it("reports quota/write failure without altering the original", () => {
    const old = "old";
    const storage = {
      getItem: () => old,
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => saveState(storage, initialState())).toThrow("Wyeksportuj");
    expect(storage.getItem()).toBe(old);
  });
  it("rejects invalid references and oversized files", () => {
    const s = initialState();
    s.saved = [{ candidateId: "missing", jobId: s.jobs[0].id }];
    expect(() => parseState(JSON.stringify(s))).toThrow("Dotychczasowy stan");
    expect(() => parseState(" ".repeat(MAX_IMPORT_BYTES + 1))).toThrow("za duży");
  });
  it("accepts legacy appearance preferences without changing scenario data", () => {
    const state = initialState();
    for (const theme of ["dark", "system", "light"]) {
      expect(parseState(JSON.stringify({ ...state, theme }))).toEqual(state);
    }
  });
});
