type ProcessHeaderProps = {
  title?: string;
  subtitle?: string;
};

export default function ProcessHeader({
  title = "Convert Any File",
  subtitle = "Drop a file and pick what to turn it into. FormatHub handles images, audio, and video instantly.",
}: ProcessHeaderProps) {
  return (
    <header className="space-y-2">
      <h1 className="font-heading text-ink text-3xl font-bold tracking-tight lg:text-4xl">
        {title}
      </h1>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </header>
  );
}
