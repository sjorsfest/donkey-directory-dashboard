interface HeaderProps {
  subtitle?: boolean;
}

export function Header({ subtitle }: HeaderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="inline-grid place-items-center w-7 h-7 rounded-md bg-primary border-2 border-foreground shadow-[var(--shadow-sm)] text-xs font-extrabold text-primary-foreground">
          D
        </span>
        <h1 className="text-lg font-bold">Donkey Directories</h1>
      </div>
      {subtitle && (
        <p className="inline-flex rounded-full border-2 px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
          Form Filler
        </p>
      )}
    </div>
  );
}
