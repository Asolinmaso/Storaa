"use client";

import Button from "@/components/Button";
import FileUploadField from "@/components/vendor/FileUploadField";
import type { StoreDetailsForm } from "@/lib/vendorOnboarding";

interface Props {
  value: StoreDetailsForm;
  onChange: (value: StoreDetailsForm) => void;
  errors: Partial<Record<keyof StoreDetailsForm, string>>;
  onNext: () => void;
}

const TEXT_FIELDS: Array<{ key: keyof StoreDetailsForm; label: string; placeholder: string }> = [
  { key: "name", label: "Name", placeholder: "Enter Store Name" },
  { key: "category", label: "Category", placeholder: "Enter Store Category" },
  { key: "storeTime", label: "Store Open & Close Timing", placeholder: "Enter Store Open & Close Timing" },
  { key: "weeklyOff", label: "Weekly Off", placeholder: "Enter Store Weekly Off" },
  { key: "address", label: "Address", placeholder: "Enter Store Address" },
  { key: "city", label: "City", placeholder: "Enter City" },
  { key: "state", label: "State", placeholder: "Enter State" },
  { key: "postalCode", label: "Postal Code", placeholder: "Enter Postal Code" },
];

export default function StoreDetailsStep({ value, onChange, errors, onNext }: Props) {
  function set<K extends keyof StoreDetailsForm>(key: K, v: StoreDetailsForm[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div>
      <h2 className="section-title">Store Details</h2>
      <div className="wizard-grid-2">
        {TEXT_FIELDS.map((f) => (
          <div className="form-field" key={f.key}>
            <label htmlFor={`sd-${f.key}`}>{f.label}</label>
            <input
              id={`sd-${f.key}`}
              type="text"
              placeholder={f.placeholder}
              value={value[f.key] as string}
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

      <div className="form-field wizard-full">
        <label htmlFor="sd-description">Short Description</label>
        <textarea
          id="sd-description"
          className="wizard-textarea"
          placeholder="Type Here..."
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
        />
        {errors.description && <p className="field-error">{errors.description}</p>}
      </div>

      <div className="wizard-actions">
        <Button small onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
