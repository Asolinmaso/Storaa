"use client";

import { useRef, useState } from "react";

interface FileUploadFieldProps {
  label: string;
  fileName: string;
  onUploaded: (url: string, name: string) => void;
  accept?: string;
  error?: string | null;
}

export default function FileUploadField({
  label,
  fileName,
  onUploaded,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  error,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        onUploaded(data.url, data.name);
      } else {
        setUploadError(data.message ?? "Upload failed. Please try again.");
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="form-field">
      <label>{label}</label>
      <div className={`file-input${error || uploadError ? " field-error-state" : ""}`}>
        <span className="file-input-name">
          {uploading ? "Uploading…" : fileName || "No File Chosen"}
        </span>
        <button
          type="button"
          className="btn btn-outline-purple btn-sm file-input-btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          ⬆ Upload File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={handleChange}
        />
      </div>
      {(error || uploadError) && (
        <p className="field-error">{error || uploadError}</p>
      )}
    </div>
  );
}
