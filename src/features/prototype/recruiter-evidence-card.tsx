import { usePrototype } from "./store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RecordSheet } from "@/components/record-sheet";
import { evidenceGaps, type EvidenceGap, type EvidenceItem } from "./evidence-follow-up";

const ratings = ["Przydatna", "Częściowo przydatna", "Nieprzydatna"];

export function EvidenceFollowUp({ employer, closed }: { employer: boolean; closed: boolean }) {
  const { state } = usePrototype();
  const gaps = employer
    ? evidenceGaps
    : evidenceGaps.filter((gap) => state.evidence?.[gap.id]?.status === "sent");
  if (!gaps.length) return <p>Nie masz jeszcze pytań ani zadań od pracodawcy.</p>;
  return (
    <RecordSheet
      label={employer ? "Luki w aplikacji" : "Pytania i zadania od pracodawcy"}
      sections={gaps.map((gap) => ({
        value: gap.id,
        label: gap.title,
        content: <FollowUp gap={gap} employer={employer} closed={closed} />,
        keepMounted: true,
      }))}
    />
  );
}

function FollowUp({
  gap,
  employer,
  closed,
}: {
  gap: EvidenceGap;
  employer: boolean;
  closed: boolean;
}) {
  const { state, updateEvidence } = usePrototype();
  const item = state.evidence?.[gap.id];
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const task = gap.kind === "task";
  const simulatedReply = employer && item?.status === "sent" && !item.reply;
  function update(next: EvidenceItem, confirmation = "") {
    updateEvidence(gap.id, next);
    setMessage(confirmation);
  }

  function submitReply() {
    if (!item || closed || !text.trim()) return;
    update({ ...item, reply: { text: text.trim() } }, "Odpowiedź wysłana.");
  }

  return (
    <section className="space-y-4">
      <h3>{gap.title}</h3>
      {employer && (
        <div className="space-y-5">
          <div className="evidence-gap">
            <h4>Czego brakuje</h4>
            <p>{gap.missing}</p>
          </div>
          <dl className="evidence-sources">
            <div>
              <dt>Wymaganie z ogłoszenia</dt>
              <dd>{gap.requirement}</dd>
            </div>
            <div>
              <dt>{gap.sourceLabel === "CV" ? "Fragment CV" : "Fragment aplikacji"}</dt>
              <dd>{gap.source}</dd>
            </div>
          </dl>
          {item?.status !== "sent" && (
            <section
              className="evidence-assistant space-y-3"
              aria-labelledby={`assistant-${gap.id}`}
            >
              <h4 id={`assistant-${gap.id}`}>Asystent AI</h4>
              <p className="record-caption">
                {task ? "Zadanie pisemne" : "Pytanie uzupełniające"} · symulacja
              </p>
              {!item && !closed && (
                <Button onClick={() => update({ status: "draft", prompt: gap.prompt })}>
                  {task ? "Przygotuj zadanie" : "Przygotuj pytanie"}
                </Button>
              )}
              {item?.status === "draft" && !closed && (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (item.prompt.trim())
                      update({ status: "accepted", prompt: item.prompt.trim() });
                  }}
                >
                  <label className="mb-2 block font-semibold" htmlFor={`prompt-${gap.id}`}>
                    {task ? "Propozycja zadania" : "Propozycja pytania"}
                  </label>
                  <Textarea
                    id={`prompt-${gap.id}`}
                    rows={4}
                    value={item.prompt}
                    onChange={(event) => update({ ...item, prompt: event.target.value })}
                  />
                  <div className="record-actions">
                    <Button type="submit" disabled={!item.prompt.trim()}>
                      Akceptuj
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => update({ ...item, status: "rejected" })}
                    >
                      Odrzuć
                    </Button>
                  </div>
                </form>
              )}
              {item?.status === "rejected" && (
                <div className="space-y-2">
                  <p>Propozycja odrzucona.</p>
                  {!closed && (
                    <Button
                      variant="outline"
                      onClick={() => update({ status: "draft", prompt: gap.prompt })}
                    >
                      Przywróć propozycję
                    </Button>
                  )}
                </div>
              )}
              {item?.status === "accepted" && (
                <div className="space-y-2">
                  <p>{item.prompt}</p>
                  {!closed && (
                    <div className="record-actions">
                      <Button
                        onClick={() => update({ ...item, status: "sent" }, "Wysłano do Marka.")}
                      >
                        Wyślij do Marka
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => update({ ...item, status: "draft" })}
                      >
                        Wróć do edycji
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}
      {item?.status === "sent" && (
        <div className="space-y-4">
          <p className="font-semibold">{task ? "Zadanie" : "Pytanie uzupełniające"}</p>
          <p>{item.prompt}</p>
          {!item.reply && !employer && !closed && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                submitReply();
              }}
            >
              <p id={`reply-hint-${gap.id}`}>Użyj wyłącznie fikcyjnych danych.</p>
              <label htmlFor={`reply-${gap.id}`}>Odpowiedź tekstowa</label>
              <Textarea
                id={`reply-${gap.id}`}
                aria-describedby={`reply-hint-${gap.id}`}
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={4}
              />
              <Button type="submit" disabled={!text.trim()}>
                Wyślij odpowiedź
              </Button>
            </form>
          )}
          {(item.reply || simulatedReply) && (
            <section className="space-y-3">
              <h4 className="font-semibold">
                {simulatedReply
                  ? "Przykładowa odpowiedź Marka"
                  : employer
                    ? "Odpowiedź Marka"
                    : "Twoja wysłana odpowiedź"}
              </h4>
              {simulatedReply && (
                <>
                  <p className="record-caption">
                    Symulacja odpowiedzi.
                    {item.prompt !== gap.prompt &&
                      " Przykład przygotowano do pierwotnej propozycji."}
                  </p>
                  <p>{gap.sampleReply}</p>
                </>
              )}
              {item.reply?.text && <p className="whitespace-pre-wrap">{item.reply.text}</p>}
              {employer && (
                <fieldset className="space-y-2">
                  <legend className="font-semibold">
                    Na ile odpowiedź pomogła wyjaśnić tę lukę?
                  </legend>
                  {ratings.map((rating) => (
                    <label key={rating} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`rating-${gap.id}`}
                        checked={(simulatedReply ? item.sampleRating : item.rating) === rating}
                        onChange={() =>
                          update(
                            simulatedReply
                              ? { ...item, sampleRating: rating }
                              : { ...item, rating },
                            "Ocena zapisana.",
                          )
                        }
                      />
                      {rating}
                    </label>
                  ))}
                </fieldset>
              )}
            </section>
          )}
        </div>
      )}
      <p role="status" className="record-caption">
        {message}
      </p>
    </section>
  );
}
