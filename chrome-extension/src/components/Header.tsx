interface HeaderProps {
  subtitle?: boolean;
}

export function Header({ subtitle }: HeaderProps) {
  return (
    <div className="header">
      <h1>Donkey Directory</h1>
      {subtitle && <p className="subtitle">Form Filler</p>}
    </div>
  );
}
