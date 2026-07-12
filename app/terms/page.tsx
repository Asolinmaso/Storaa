import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="center-page">
      <div className="card">
        <h1 className="card-title">Terms &amp; Conditions</h1>
        <p className="card-text">
          Our terms and conditions will be published here soon.
        </p>
        <p className="card-footer">
          <Link href="/signup">Back to Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
