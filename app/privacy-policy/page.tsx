import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="center-page">
      <div className="card">
        <h1 className="card-title">Privacy Policy</h1>
        <p className="card-text">
          Our privacy policy will be published here soon.
        </p>
        <p className="card-footer">
          <Link href="/signup">Back to Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
