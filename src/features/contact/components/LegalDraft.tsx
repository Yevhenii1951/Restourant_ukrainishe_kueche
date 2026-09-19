interface LegalDraftProps {
  title: string;
  warning: string;
  children: React.ReactNode;
}

export default function LegalDraft({ title, warning, children }: LegalDraftProps): React.ReactElement {
  return (
    <article className="max-w-3xl space-y-6">
      <h1 className="font-display text-4xl font-semibold">{title}</h1>
      <p className="rounded-2xl border-2 border-kalyna bg-paper p-5 font-semibold">{warning}</p>
      <div className="space-y-5 text-ink/80">{children}</div>
    </article>
  );
}
