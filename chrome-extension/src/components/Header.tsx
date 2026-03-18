export function Header() {
  return (

      <a className="flex items-center gap-2.5" href="https://donkey.directory" target="_blank" rel="noopener noreferrer">
      <img
        src="./icons/donkey.png"
        alt="Donkey Directories"
        className="block h-9 w-9 object-contain"
      />
      <span className="select-none font-[Fredoka,_Nunito,_ui-sans-serif,_system-ui,_sans-serif] text-2xl font-bold tracking-[-0.02em] text-primary [-webkit-text-stroke:2px_hsl(var(--foreground))] [paint-order:stroke_fill] ">
        Donkey Directories
      </span>
      </a>

  );
}
