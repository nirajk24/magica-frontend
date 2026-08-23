"use client";

import { ChevronLeft, ChevronRight, Pencil, Upload, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Question, QuestionsPayload, ResolveWaitpoint } from "@/contracts";
import { Spinner } from "@/components/Spinner";
import { UploadChips } from "@/components/chat/ComposerAttachments";
import { cn } from "@/lib/cn";
import { useUploadAttachments } from "@/queries/use-upload-attachments";

type Answers = Record<string, string | string[]>;

/**
 * The docked question panel. It replaces the composer while the agent waits, one question at a time
 * with a `n of m` pager, and it submits **once** — answers and skips accumulate here and go to the
 * waitpoint together after the last question, because one waitpoint takes one resolution.
 *
 * Skip is always available, required questions included: the UI never blocks, and the skipped ids go
 * back to the model, which decides what to do about the gap. `✕` hides the panel without resolving
 * anything — the waitpoint stays pending and the screen keeps a way back in.
 *
 * Keyboard, per the capture hints: `Enter` submits, `Esc` skips, `↑↓` move a select's focus.
 */
export function QuestionPanel({
  payload,
  resolving,
  onResolve,
  onDismiss,
}: {
  payload: QuestionsPayload;
  resolving: boolean;
  onResolve: (resolution: Extract<ResolveWaitpoint, { kind: "questions" }>) => void;
  onDismiss: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [skipped, setSkipped] = useState<readonly string[]>([]);

  const questions = payload.questions;
  const question = questions[index];
  if (!question) return null;

  const finish = (finalAnswers: Answers, finalSkipped: readonly string[]) => {
    const answered = new Set(Object.keys(finalAnswers));

    onResolve({
      kind: "questions",
      answers: finalAnswers,
      skipped: questions.map((q) => q.id).filter((id) => !answered.has(id) || finalSkipped.includes(id)),
    });
  };

  const advance = (nextAnswers: Answers, nextSkipped: readonly string[]) => {
    setAnswers(nextAnswers);
    setSkipped(nextSkipped);

    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }

    finish(nextAnswers, nextSkipped);
  };

  const save = (value: string | string[]) =>
    advance(
      { ...answers, [question.id]: value },
      skipped.filter((id) => id !== question.id),
    );

  const skip = () => {
    const rest = { ...answers };
    delete rest[question.id];
    advance(rest, skipped.includes(question.id) ? skipped : [...skipped, question.id]);
  };

  return (
    <section
      aria-label="Questions from the agent"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          skip();
        }
      }}
      className="rounded-composer border border-border bg-surface bg-linear-to-b from-composer-from to-composer-to p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-fg">
          {question.prompt}
          {question.required && <span className="ml-0.5 text-fg-subtle">*</span>}
        </p>

        <div className="flex shrink-0 items-center gap-1 text-xs text-fg-subtle">
          <PagerButton
            label="Previous question"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </PagerButton>
          <span>
            {index + 1} of {questions.length}
          </span>
          <PagerButton
            label="Next question"
            disabled={index + 1 >= questions.length}
            onClick={() => setIndex(index + 1)}
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </PagerButton>
          <button
            type="button"
            aria-label="Dismiss questions"
            onClick={onDismiss}
            className="ml-1 rounded-md p-1 text-fg-subtle transition-colors hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <QuestionBody
          key={question.id}
          question={question}
          initial={answers[question.id]}
          resolving={resolving}
          onSave={save}
          onSkip={skip}
        />
      </div>
    </section>
  );
}

function QuestionBody({
  question,
  initial,
  resolving,
  onSave,
  onSkip,
}: {
  question: Question;
  initial: string | string[] | undefined;
  resolving: boolean;
  onSave: (value: string | string[]) => void;
  onSkip: () => void;
}) {
  if (question.type === "text") {
    return (
      <TextAnswer
        initial={typeof initial === "string" ? initial : ""}
        hint="Enter to submit · Esc to skip"
        resolving={resolving}
        onSave={onSave}
        onSkip={onSkip}
      />
    );
  }

  if (question.type === "select") {
    return (
      <SelectAnswer question={question} resolving={resolving} onSave={onSave} onSkip={onSkip} />
    );
  }

  return (
    <ImageAnswer
      maxImages={question.maxImages}
      resolving={resolving}
      onSave={onSave}
      onSkip={onSkip}
    />
  );
}

function TextAnswer({
  initial,
  hint,
  resolving,
  onSave,
  onSkip,
}: {
  initial: string;
  hint: string;
  resolving: boolean;
  onSave: (value: string) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState(initial);

  const submit = () => {
    if (value.trim()) onSave(value.trim());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    event.preventDefault();
    submit();
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type your answer..."
        aria-label="Your answer"
        className="w-full rounded-card border border-border bg-bg px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-border-strong"
      />
      <PanelFooter
        hint={hint}
        resolving={resolving}
        saveDisabled={value.trim().length === 0}
        onSave={submit}
        onSkip={onSkip}
      />
    </div>
  );
}

function SelectAnswer({
  question,
  resolving,
  onSave,
  onSkip,
}: {
  question: Extract<Question, { type: "select" }>;
  resolving: boolean;
  onSave: (value: string) => void;
  onSkip: () => void;
}) {
  const [focused, setFocused] = useState(0);
  const [other, setOther] = useState(false);

  if (other) {
    return (
      <TextAnswer
        initial=""
        hint="Enter to submit · Esc to skip"
        resolving={resolving}
        onSave={onSave}
        onSkip={onSkip}
      />
    );
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocused(Math.min(focused + 1, question.options.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocused(Math.max(focused - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = question.options[focused];
      if (option) onSave(option.value);
    }
  };

  return (
    <div className="flex flex-col gap-3" onKeyDown={onKeyDown}>
      <div role="listbox" aria-label="Options" className="flex flex-col gap-1">
        {question.options.map((option, position) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={position === focused}
            onMouseMove={() => setFocused(position)}
            onClick={() => onSave(option.value)}
            className={cn(
              "flex items-center gap-2.5 rounded-card px-3 py-2.5 text-left text-sm transition-colors",
              position === focused ? "bg-bg text-fg" : "text-fg-muted",
            )}
          >
            <span className="text-fg-subtle">{position + 1}.</span>
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {option.recommended && (
              <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                Recommended
              </span>
            )}
            {position === focused && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        {question.allowOther ? (
          <button
            type="button"
            onClick={() => setOther(true)}
            className="flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <Pencil className="size-3.5" aria-hidden />
            Something else
          </button>
        ) : (
          <span />
        )}
        <PanelFooter
          hint="↑↓ to navigate · Enter to select · Esc to skip"
          resolving={resolving}
          onSkip={onSkip}
        />
      </div>
    </div>
  );
}

/**
 * The image question: a drop zone over the same upload pipeline the composer uses. The answer that
 * goes back is the attachment IDS — never URLs; the server resolves ids at resolve time, and a
 * non-ready or foreign id answers 404.
 */
function ImageAnswer({
  maxImages,
  resolving,
  onSave,
  onSkip,
}: {
  maxImages: number;
  resolving: boolean;
  onSave: (value: string[]) => void;
  onSkip: () => void;
}) {
  const uploads = useUploadAttachments(maxImages);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-fg-subtle">
        Images ({uploads.items.length}/{maxImages})
      </p>

      <UploadChips uploads={uploads} />

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={maxImages > 1}
        hidden
        aria-hidden
        tabIndex={-1}
        onChange={(event) => {
          uploads.addFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploads.full}
        onClick={() => input.current?.click()}
        className="flex flex-col items-center gap-1 rounded-card border border-dashed border-border py-6 text-center transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Upload className="size-4 text-fg-subtle" aria-hidden />
        <span className="text-sm text-fg-muted">
          {uploads.full ? "That's the limit for this question" : "Click to upload an image"}
        </span>
        <span className="text-xs text-fg-subtle">Or skip — the agent will work around it.</span>
      </button>

      <PanelFooter
        hint="Esc to skip"
        resolving={resolving}
        saveDisabled={uploads.readyIds.length === 0 || !uploads.settled}
        onSave={() => onSave(uploads.readyIds)}
        onSkip={onSkip}
      />
    </div>
  );
}

function PanelFooter({
  hint,
  resolving,
  saveDisabled,
  onSave,
  onSkip,
}: {
  hint: string;
  resolving: boolean;
  /** Present only where the type has a Save & Next at all — a select resolves by picking. */
  saveDisabled?: boolean;
  onSave?: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="mr-auto text-xs text-fg-subtle">{hint}</span>
      <button
        type="button"
        disabled={resolving}
        onClick={onSkip}
        className="h-8 rounded-full px-3 text-sm text-fg-muted transition-colors hover:text-fg disabled:opacity-60"
      >
        Skip
      </button>
      {onSave && (
        <button
          type="button"
          disabled={resolving || saveDisabled}
          onClick={onSave}
          className="flex h-8 items-center gap-1.5 rounded-full bg-fg px-3.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resolving && <Spinner className="size-3.5" />}
          Save & Next
        </button>
      )}
    </div>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-0.5 text-fg-subtle transition-colors hover:text-fg disabled:opacity-40"
    >
      {children}
    </button>
  );
}
