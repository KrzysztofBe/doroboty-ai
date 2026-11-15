import type { EvidenceGap, EvidenceItem } from "./evidence-follow-up";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialState, transition, type Action, type State } from "./model";
import { parseState, readState, saveState, STORAGE_KEY, type StoragePort } from "./storage";
function browserStorage(): StoragePort | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function useStore() {
  const [loaded] = useState(() => readState(browserStorage()));
  const [state, setState] = useState(loaded.state);
  const [issue, setIssue] = useState(loaded.issue);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(loaded.blocked);
  const latest = useRef(state);
  const persisted = useRef(loaded.persisted);
  const recoveryBlocked = useRef(loaded.blocked);
  async function commit(next: State, replace = false, showImmediately = false) {
    latest.current = next;
    if (showImmediately) setState(next);
    setError("");
    await persist(next, replace);
    if (latest.current === next) setState(next);
  }
  async function persist(next: State, replace: boolean) {
    try {
      if (!navigator.locks) {
        setIssue("Bezpieczny zapis jest niedostępny. Wyeksportuj zmiany przed zamknięciem strony.");
        return;
      }
      await navigator.locks.request(STORAGE_KEY, () => {
        if (recoveryBlocked.current && !replace) return;
        persisted.current = saveState(browserStorage(), next, persisted.current);
        setIssue("");
        if (replace) {
          recoveryBlocked.current = false;
          setBlocked(false);
        }
      });
    } catch (e) {
      setIssue((e as Error).message);
    }
  }
  async function run(action: Action) {
    try {
      await commit(transition(latest.current, action));
      return true;
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "ZodError"
          ? e.message
          : "Sprawdź poprawność i długość wprowadzonych danych.",
      );
      return false;
    }
  }
  async function importState(raw: string) {
    try {
      const next = parseState(raw);
      await commit({ ...next, evidence: next.evidence ?? {} }, true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  return {
    state,
    issue,
    error,
    blocked,
    original: loaded.original,
    run,
    updateEvidence(id: EvidenceGap["id"], item: EvidenceItem) {
      void commit(
        { ...latest.current, evidence: { ...latest.current.evidence, [id]: item } },
        false,
        true,
      );
    },
    importState,
    clearError: () => setError(""),
    reset: () => commit(initialState(), true),
  };
}
type Store = ReturnType<typeof useStore>;
const Context = createContext<Store | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function usePrototype() {
  const store = useContext(Context);
  if (!store) throw new Error("PrototypeProvider is required");
  return store;
}
