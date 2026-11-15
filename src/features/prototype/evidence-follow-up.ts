import { z } from "zod";

export const evidenceGaps = [
  {
    id: "discovery",
    title: "Wpływ badań na decyzję",
    requirement: "„Poprowadzisz discovery i zbierzesz dane o obecnym sposobie pracy”",
    sourceLabel: "CV",
    source: "„Prowadzenie warsztatów z użytkownikami”",
    missing: "Nie wiadomo, co Marek ustalił na warsztatach i jak wykorzystał te informacje.",
    kind: "question",
    sampleReply:
      "Na warsztatach wyszło, że agenci tracili najwięcej czasu na ustalanie, do kogo przekazać zgłoszenie. Po tym spotkaniu przesunęliśmy automatyczne kierowanie zgłoszeń przed generowanie gotowych odpowiedzi.",
    prompt:
      "Jaki problem odkryłeś na warsztatach z użytkownikami i jak to odkrycie zmieniło priorytety zespołu? Podaj konkretny przykład.",
  },
  {
    id: "measurement",
    title: "Wiarygodność wyniku 25%",
    requirement: "„porównacie wynik z punktem wyjścia”",
    sourceLabel: "Aplikacja",
    source: "„wdrożenie, które skróciło czas odpowiedzi o 25%”",
    missing:
      "Brakuje definicji miary, okresu porównania i sposobu uwzględnienia zmian w liczbie zgłoszeń.",
    kind: "task",
    sampleReply:
      "Najpierw porównałbym medianę czasu od wpływu zgłoszenia do pierwszej odpowiedzi. Na fikcyjnych danych spadek z 40 do 30 minut daje 25%. Potem porównałbym te same typy zgłoszeń w obu okresach, bo np. większy udział prostych spraw mógł obniżyć ogólną medianę.",
    prompt:
      "Opisz, jak sprawdzisz deklarowany spadek czasu odpowiedzi o 25%. Użyj fikcyjnych danych z dwóch okresów. Zdefiniuj miarę, oblicz zmianę i wyjaśnij, jak uwzględnisz różnice w liczbie lub typie zgłoszeń.",
  },
  {
    id: "ownership",
    title: "Samodzielna decyzja o zakresie",
    requirement: "„Chcemy poznać decyzje i ich konsekwencje”",
    sourceLabel: "CV",
    source: "„praca z backlogiem i zespołem wdrożeniowym”",
    missing: "Nie wiadomo, którą decyzję Marek podjął samodzielnie i na czym ją oparł.",
    kind: "question",
    sampleReply:
      "Zdecydowałem, że w pilocie automatyzujemy kierowanie zgłoszeń, a generowanie odpowiedzi odkładamy. W próbce 120 spraw błędne przekierowania były częstsze niż powtarzalne pytania. Ja ustaliłem zakres pilota, a zespół wdrożeniowy dobrał reguły i zbudował integrację.",
    prompt:
      "Którą decyzję o zakresie automatyzacji podjąłeś osobiście? Opisz rozważane opcje, dane, na których się oparłeś, i wkład zespołu.",
  },
] as const;

export type EvidenceGap = (typeof evidenceGaps)[number];

const evidenceItemSchema = z.object({
  status: z.enum(["draft", "accepted", "rejected", "sent"]),
  prompt: z.string(),
  reply: z.object({ text: z.string() }).optional(),
  rating: z.string().optional(),
  sampleRating: z.string().optional(),
});
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const legacyEvidenceKey = "doroboty-evidence-example-v1";
export const evidenceStoreSchema = z.partialRecord(
  z.enum(["discovery", "measurement", "ownership"]),
  evidenceItemSchema,
);

export function readLegacyEvidence(raw: string) {
  const entries = z.record(z.string(), z.unknown()).parse(JSON.parse(raw));
  const result: z.infer<typeof evidenceStoreSchema> = {};
  for (const { id } of evidenceGaps) {
    const entry = evidenceItemSchema.safeParse(entries[id]);
    if (!entry.success) continue;
    if (!entry.data.reply?.text.trim()) delete entry.data.reply;
    result[id] = entry.data;
  }
  return result;
}
