"use client";

import Button from "@/components/Button";
import FileUploadField from "@/components/vendor/FileUploadField";
import type { VendorBankForm } from "@/lib/vendorOnboarding";

interface Props {
  value: VendorBankForm;
  onChange: (value: VendorBankForm) => void;
  errors: Partial<Record<keyof VendorBankForm, string>>;
  onNext: () => void;
  onBack: () => void;
}

const TEXT_FIELDS: Array<{ key: keyof VendorBankForm; label: string; placeholder: string }> = [
  { key: "ownerName", label: "Owner Name", placeholder: "Enter Owner Name" },
  { key: "ownerEmail", label: "Owner Email", placeholder: "Enter Owner Email" },
  { key: "accountHolderName", label: "Account Holder name", placeholder: "Enter Account Holder name" },
  { key: "bankName", label: "Bank Name", placeholder: "Enter Bank Name" },
  { key: "bankAccountNumber", label: "Bank Account Number", placeholder: "Enter Bank Account Number" },
  { key: "bankIfsc", label: "Bank IFSC Code", placeholder: "Enter Bank IFSC Code" },
  { key: "gstNumber", label: "GST Number", placeholder: "Enter GST Number" },
  { key: "panNumber", label: "PAN Number", placeholder: "Enter PAN Number" },
];

export default function VendorBankStep({ value, onChange, errors, onNext, onBack }: Props) {
  function set<K extends keyof VendorBankForm>(key: K, v: VendorBankForm[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div>
      <h2 className="section-title">Other Details</h2>
      <div className="wizard-grid-2">
        <div className="form-field">
          <label htmlFor="vb-ownerName">Owner Name</label>
          <input
            id="vb-ownerName"
            type="text"
            placeholder="Enter Owner Name"
            value={value.ownerName}
            onChange={(e) => set("ownerName", e.target.value)}
          />
          {errors.ownerName && <p className="field-error">{errors.ownerName}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="vb-ownerContact">Owner Contact</label>
          <div className="phone-input">
            <span className="phone-prefix">+91 ▾</span>
            <input
              id="vb-ownerContact"
              type="tel"
              placeholder="Phone number"
              value={value.ownerContact}
              onChange={(e) => set("ownerContact", e.target.value)}
            />
          </div>
          {errors.ownerContact && <p className="field-error">{errors.ownerContact}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="vb-ownerEmail">Owner Email</label>
          <input
            id="vb-ownerEmail"
            type="email"
            placeholder="Enter Owner Email"
            value={value.ownerEmail}
            onChange={(e) => set("ownerEmail", e.target.value)}
          />
          {errors.ownerEmail && <p className="field-error">{errors.ownerEmail}</p>}
        </div>

        <FileUploadField
          label="Owner Government ID Proof"
          fileName={value.ownerGovIdName}
          error={errors.ownerGovIdUrl}
          onUploaded={(url, name) =>
            onChange({ ...value, ownerGovIdUrl: url, ownerGovIdName: name })
          }
        />

        {TEXT_FIELDS.filter((f) =>
          ["accountHolderName", "bankName", "bankAccountNumber", "bankIfsc", "gstNumber", "panNumber"].includes(
            f.key
          )
        ).map((f) => (
          <div className="form-field" key={f.key}>
            <label htmlFor={`vb-${f.key}`}>{f.label}</label>
            <input
              id={`vb-${f.key}`}
              type="text"
              placeholder={f.placeholder}
              value={value[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
            />
            {errors[f.key] && <p className="field-error">{errors[f.key]}</p>}
          </div>
        ))}
      </div>

      <div className="wizard-actions wizard-actions-split">
        <Button variant="outline-purple" small onClick={onBack}>
          Back
        </Button>
        <Button small onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
