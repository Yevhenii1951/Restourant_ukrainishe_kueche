interface KalynaLogoProps {
  tone?: "light" | "dark";
  className?: string;
}

export default function KalynaLogo({
  tone = "light",
  className,
}: KalynaLogoProps): React.ReactElement {
  const isDark = tone === "dark";

  return (
    <span className={className}>
      <span
        className={`font-display text-3xl font-bold leading-none tracking-tight sm:text-4xl ${
          isDark ? "text-cream" : "text-brand"
        }`}
      >
        Kalyna
      </span>
      <span
        aria-hidden="true"
        className="mt-2 flex items-center justify-start gap-[5px]"
      >
        <span
          className={`h-1.5 w-1.5 -rotate-45 ${
            isDark ? "bg-lime" : "bg-brand"
          }`}
        />
        <span
          className={`h-1 w-1 -rotate-45 ${
            isDark ? "bg-cream/60" : "bg-ink/45"
          }`}
        />
        <span className={`h-2 w-2 -rotate-45 ${isDark ? "bg-lime" : "bg-lime"}`} />
        <span
          className={`h-1 w-1 -rotate-45 ${
            isDark ? "bg-cream/60" : "bg-ink/45"
          }`}
        />
        <span
          className={`h-1.5 w-1.5 -rotate-45 ${
            isDark ? "bg-lime" : "bg-brand"
          }`}
        />
      </span>
    </span>
  );
}