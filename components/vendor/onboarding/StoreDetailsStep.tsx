"use client";

import { useState } from "react";
import Button from "@/components/Button";
import FileUploadField from "@/components/vendor/FileUploadField";
import { CATEGORIES } from "@/lib/catalog";
import type { StoreDetailsForm } from "@/lib/vendorOnboarding";

interface Props {
  value: StoreDetailsForm;
  onChange: (value: StoreDetailsForm) => void;
  errors: Partial<Record<keyof StoreDetailsForm, string>>;
  onNext: () => void;
}

type TextKey = "name" | "address" | "city" | "state" | "postalCode";

const TEXT_FIELDS: Array<{ key: TextKey; label: string; placeholder: string }> = [
  { key: "name", label: "Name", placeholder: "Enter Store Name" },
  { key: "address", label: "Address", placeholder: "Enter Store Address" },
  { key: "city", label: "City", placeholder: "Enter City" },
  { key: "state", label: "State", placeholder: "Enter State" },
  { key: "postalCode", label: "Postal Code", placeholder: "Enter Postal Code" },
];

export default function StoreDetailsStep({ value, onChange, errors, onNext }: Props) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  function set<K extends keyof StoreDetailsForm>(key: K, v: StoreDetailsForm[K]) {
    onChange({ ...value, [key]: v });
  }

  function useCurrentLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Location is not supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${coords.latitude}&lon=${coords.longitude}`,
            { headers: { Accept: "application/json" } }
          );
          if (!res.ok) throw new Error("reverse geocode failed");
          const data = await res.json();
          const a = data.address ?? {};
          const street = [a.house_number, a.road, a.neighbourhood ?? a.suburb]
            .filter(Boolean)
            .join(", ");
          onChange({
            ...value,
            address: street || data.display_name?.split(",").slice(0, 2).join(",").trim() || "",
            city: a.city ?? a.town ?? a.village ?? a.county ?? a.state_district ?? "",
            state: a.state ?? "",
            postalCode: a.postcode ?? "",
          });
        } catch {
          setLocationError("Couldn't look up your address. Please enter it manually.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow location access and try again."
            : "Couldn't get your location. Please enter the address manually."
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  // Keep a previously saved category selectable even if it isn't in the list.
  const categoryNames: string[] = CATEGORIES.map((c) => c.name);
  if (value.category && !categoryNames.includes(value.category)) {
    categoryNames.push(value.category);
  }

  return (
    <div>
      <h2 className="section-title">Store Details</h2>
      <div className="wizard-grid-2">
        <div className="form-field">
          <label htmlFor="sd-name">Name</label>
          <input
            id="sd-name"
            type="text"
            placeholder="Enter Store Name"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="sd-category">Category</label>
          <select
            id="sd-category"
            className="wizard-select"
            value={value.category}
            onChange={(e) => set("category", e.target.value)}
          >
            <option value="">Select Store Category</option>
            {categoryNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <p className="field-error">{errors.category}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="sd-open">Store Opening Date & Time</label>
          <input
            id="sd-open"
            type="datetime-local"
            value={value.openTime}
            onChange={(e) => set("openTime", e.target.value)}
          />
          {errors.openTime && <p className="field-error">{errors.openTime}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="sd-close">Store Closing Date & Time</label>
          <input
            id="sd-close"
            type="datetime-local"
            min={value.openTime || undefined}
            value={value.closeTime}
            onChange={(e) => set("closeTime", e.target.value)}
          />
          {errors.closeTime && <p className="field-error">{errors.closeTime}</p>}
        </div>

        <div className="wizard-location-row">
          <Button small variant="outline-purple" onClick={useCurrentLocation} disabled={locating}>
            {locating ? "Getting location…" : "📍 Use My Current Location"}
          </Button>
          {locationError && <p className="field-error">{locationError}</p>}
        </div>

        {TEXT_FIELDS.filter((f) => f.key !== "name").map((f) => (
          <div className="form-field" key={f.key}>
            <label htmlFor={`sd-${f.key}`}>{f.label}</label>
            <input
              id={`sd-${f.key}`}
              type="text"
              placeholder={f.placeholder}
              value={value[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
            />
            {errors[f.key] && <p className="field-error">{errors[f.key]}</p>}
          </div>
        ))}

        <FileUploadField
          label="Store Photo"
          fileName={value.storePhotoName}
          error={errors.storePhotoUrl}
          onUploaded={(url, name) =>
            onChange({ ...value, storePhotoUrl: url, storePhotoName: name })
          }
        />
        <FileUploadField
          label="Business Registration Document Proof"
          fileName={value.bizRegDocName}
          error={errors.bizRegDocUrl}
          onUploaded={(url, name) =>
            onChange({ ...value, bizRegDocUrl: url, bizRegDocName: name })
          }
        />
      </div>

      <div className="wizard-actions">
        <Button small onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
