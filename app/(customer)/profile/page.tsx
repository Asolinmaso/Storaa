"use client";

import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/Button";
import Toggle from "@/components/customer/Toggle";
import { useEscape } from "@/lib/useEscape";
import type { ProfileDTO } from "@/lib/types";

const UPDATE_ROWS = [
  {
    key: "holdUpdates" as const,
    title: "Hold & Visit Updates",
    text: "Get updates about your holds & visit reminders",
  },
  {
    key: "offers" as const,
    title: "Offers & New Launches",
    text: "Get offers from nearby stores",
  },
  {
    key: "newStores" as const,
    title: "New store alerts",
    text: "Know when new store joins near you",
  },
];

const HELP_ROWS = [
  { title: "Contact Us", text: "Get updates about your holds & visit reminders" },
  { title: "Report An Issue", text: "Let us know if something isn't right" },
  { title: "About Us", text: "Know More about Storaa" },
];

type ModalKind = "edit" | "address" | null;

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setProfile(data.user ?? null))
      .catch(() => setError("Failed to load profile. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  async function updatePrefs(key: keyof ProfileDTO["prefs"], value: boolean) {
    if (!profile) return;
    const prev = profile;
    setProfile({ ...profile, prefs: { ...profile.prefs, [key]: value } });
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefs: { [key]: value } }),
    });
    if (!res.ok) setProfile(prev);
  }

  if (loading) return <p className="muted">Loading profile…</p>;
  if (error || !profile)
    return <div className="form-banner form-banner-error">{error}</div>;

  const initials =
    (profile.name || profile.email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className="page-stack">
      <section>
        <div className="section-head">
          <h2 className="section-title">Basic Information</h2>
          <Button small onClick={() => setModal("edit")}>
            Edit Profile
          </Button>
        </div>
        <div className="profile-basic">
          <span className="profile-avatar">{initials}</span>
          <div className="profile-fields">
            <p>
              <strong>Name :</strong> {profile.name || "—"}
            </p>
            <p>
              <strong>Mobile :</strong> {profile.phone ? `+91 - ${profile.phone}` : "—"}
            </p>
            <p>
              <strong>Email :</strong> {profile.email}
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section>
        <div className="section-head">
          <h2 className="section-title">Addresses</h2>
          <Button small onClick={() => setModal("address")}>
            Add Address
          </Button>
        </div>
        {profile.addresses.length === 0 ? (
          <p className="muted">No addresses yet. Add your first address.</p>
        ) : (
          <div className="address-grid">
            {profile.addresses.map((a) => (
              <div key={a._id} className="address-card">
                <div className="address-head">
                  <span className="address-label">
                    🏠 {a.label}
                    {a.isDefault ? " (Default)" : ""}
                  </span>
                  <button
                    type="button"
                    className="address-menu"
                    aria-label={`Delete ${a.label} address`}
                    onClick={async () => {
                      const res = await fetch(
                        `/api/profile/addresses?id=${a._id}`,
                        { method: "DELETE" }
                      );
                      const data = await res.json();
                      if (res.ok)
                        setProfile({ ...profile, addresses: data.addresses });
                    }}
                  >
                    ⋮
                  </button>
                </div>
                <p className="address-text">
                  {[a.line1, a.line2, a.city, a.state, a.country]
                    .filter(Boolean)
                    .join(", ")}
                  {a.postalCode ? ` - ${a.postalCode}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="divider" />

      <div className="profile-panels">
        <div className="panel">
          <h2 className="section-title">Receive Updates</h2>
          <ul className="panel-list">
            {UPDATE_ROWS.map((row) => (
              <li key={row.key}>
                <div>
                  <p className="panel-row-title">{row.title}</p>
                  <p className="panel-row-text">{row.text}</p>
                </div>
                <Toggle
                  checked={profile.prefs[row.key]}
                  onChange={(v) => updatePrefs(row.key, v)}
                  label={row.title}
                />
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">Help &amp; Support</h2>
          <ul className="panel-list">
            {HELP_ROWS.map((row) => (
              <li key={row.title}>
                <div>
                  <p className="panel-row-title">{row.title}</p>
                  <p className="panel-row-text">{row.text}</p>
                </div>
                <span className="panel-chevron" aria-hidden="true">
                  ›
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {modal === "edit" && (
        <EditProfileModal
          profile={profile}
          onClose={() => setModal(null)}
          onSaved={(user) => {
            setProfile(user);
            setModal(null);
          }}
        />
      )}
      {modal === "address" && (
        <AddAddressModal
          onClose={() => setModal(null)}
          onSaved={(addresses) => {
            setProfile({ ...profile, addresses });
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: ProfileDTO;
  onClose: () => void;
  onSaved: (user: ProfileDTO) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscape(onClose);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
      });
      const data = await res.json();
      if (res.ok) onSaved(data.user);
      else setError(data.message ?? "Something went wrong.");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Profile"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal form-modal">
        <div className="form-modal-head">
          <h2 className="form-modal-title">Edit Profile</h2>
          <button className="form-modal-close" onClick={onClose} aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <form className="form-modal-form" onSubmit={handleSubmit}>
          {error && <div className="form-banner form-banner-error">{error}</div>}
          <div className="form-field">
            <label htmlFor="pf-name">Name</label>
            <input
              id="pf-name"
              type="text"
              placeholder="Enter Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="pf-phone">Phone number</label>
            <div className="phone-input">
              <span className="phone-prefix">+91 ▾</span>
              <input
                id="pf-phone"
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="pf-email">Email</label>
            <input
              id="pf-email"
              type="email"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-modal-actions">
            <Button type="submit" small loading={loading}>
              Update
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddAddressModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (addresses: ProfileDTO["addresses"]) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    label: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscape(onClose);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.line1.trim()) {
      setError("Address Line 1 is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profile/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) onSaved(data.addresses);
      else setError(data.message ?? "Something went wrong.");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Add New Address"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal form-modal form-modal-lg">
        <div className="form-modal-head">
          <h2 className="form-modal-title">Add New Address</h2>
          <button className="form-modal-close" onClick={onClose} aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <form className="form-modal-form" onSubmit={handleSubmit}>
          {error && <div className="form-banner form-banner-error">{error}</div>}
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="ad-name">Name</label>
              <input id="ad-name" type="text" placeholder="Enter Name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="ad-phone">Phone number</label>
              <div className="phone-input">
                <span className="phone-prefix">+91 ▾</span>
                <input id="ad-phone" type="tel" placeholder="Phone number" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="ad-label">Label</label>
            <input id="ad-label" type="text" placeholder="Enter Label (Home, Work..)" value={form.label} onChange={(e) => set("label", e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="ad-line1">Address Line 1</label>
            <input id="ad-line1" type="text" placeholder="Enter Address Line 1" value={form.line1} onChange={(e) => set("line1", e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="ad-line2">Address Line 2</label>
            <input id="ad-line2" type="text" placeholder="Enter Address Line 2 (Optional)" value={form.line2} onChange={(e) => set("line2", e.target.value)} />
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="ad-city">City</label>
              <input id="ad-city" type="text" placeholder="Enter City" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="ad-state">State</label>
              <input id="ad-state" type="text" placeholder="Enter State" value={form.state} onChange={(e) => set("state", e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="ad-postal">Postal Code</label>
              <input id="ad-postal" type="text" placeholder="Enter Postal Code" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="ad-country">Country</label>
              <input id="ad-country" type="text" placeholder="Enter Country" value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
          </div>
          <div className="form-modal-actions">
            <Button type="submit" small loading={loading}>
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
