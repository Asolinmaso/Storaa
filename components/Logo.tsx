interface LogoProps {
  small?: boolean;
  variant?: "default" | "light";
  className?: string;
  height?: number;
}

export default function Logo({
  small = false,
  variant = "default",
  className = "",
  height,
}: LogoProps) {
  const defaultHeight = small ? 28 : 42;
  const logoHeight = height || defaultHeight;

  return (
    <span className={`logo-wrap ${small ? "logo-wrap-sm" : ""} ${className}`.trim()} aria-label="Storaa">
      <img
        src="/logo.png"
        alt="Storaa"
        className={`logo-img ${variant === "light" ? "logo-img-light" : ""}`}
        style={{
          height: `${logoHeight}px`,
          width: "auto",
          objectFit: "contain",
          display: "block",
        }}
      />
    </span>
  );
}

