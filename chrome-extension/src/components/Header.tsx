interface HeaderProps {
  subtitle?: boolean;
}

export function Header({ subtitle }: HeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-lg font-semibold">Donkey Directory</h1>
      {subtitle && (
        <p className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Form Filler
        </p>
      )}
    </div>
  );
}
