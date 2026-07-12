import Logo from "./Logo";

interface AuthLayoutProps {
  heading: string;
  text: string;
  children: React.ReactNode;
}

export default function AuthLayout({ heading, text, children }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <aside className="auth-side">
        <div className="auth-side-content">
          <Logo />
          <h2 className="auth-side-heading">{heading}</h2>
          <p className="auth-side-text">{text}</p>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
