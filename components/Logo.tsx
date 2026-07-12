export default function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "logo logo-sm" : "logo"} aria-label="Storaa">
      st<span className="logo-accent">o</span>raa
    </span>
  );
}
