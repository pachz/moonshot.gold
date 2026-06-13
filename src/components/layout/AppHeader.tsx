import { Link } from "react-router-dom";
import { SignOutButton } from "@/components/auth/SignOutButton";

interface AppHeaderProps {
  backTo?: string;
  backLabel?: string;
}

export function AppHeader({ backTo, backLabel }: AppHeaderProps) {
  return (
    <header className="home-header">
      <a href="/" className="home-brand" style={{ textDecoration: "none" }}>
        <span>🌙</span>
        <span>moonshot.gold</span>
      </a>
      <div className="home-header-actions">
        {backTo ? (
          <Link to={backTo} className="header-link">
            {backLabel ?? "بازگشت"}
          </Link>
        ) : null}
        <SignOutButton />
      </div>
    </header>
  );
}
