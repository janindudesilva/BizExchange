"use client";

import { useRef, useState } from "react";
import { apiRequest, apiUpload } from "@/lib/api";

// ── FileDropZone ──
interface FileDropZoneProps {
  label: string;
  hint: string;
  sub: string;
  accept: string;
  iconClass: string;
  icon: string;
  badge: string;
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function FileDropZone({
                        label, hint, sub, accept, iconClass, icon, badge, files, onAdd, onRemove,
                      }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addUnique = (incoming: File[]) => {
    const unique = incoming.filter(
        (f) => !files.find((x) => x.name === f.name && x.size === f.size)
    );
    if (unique.length) onAdd(unique);
  };

  return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-slate-600">{label}</span>
          <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
          {badge}
        </span>
        </div>

        <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addUnique(Array.from(e.dataTransfer.files));
            }}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors
          ${dragging
                ? "border-blue-400 bg-blue-50"
                : "border-slate-200 hover:border-blue-300 hover:bg-slate-100"
            }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${iconClass}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">{hint}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        </div>

        <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={(e) => addUnique(Array.from(e.target.files ?? []))}
        />

        {files.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {files.map((f, i) => (
                  <li
                      key={i}
                      className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-slate-700 flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{fmtSize(f.size)}</span>
                    <button
                        type="button"
                        onClick={() => onRemove(i)}
                        className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                        aria-label={`Remove ${f.name}`}
                    >
                      ✕
                    </button>
                  </li>
              ))}
            </ul>
        )}
      </div>
  );
}

// ── Main Page ──
export default function CreateBusinessPage() {
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [financialFiles, setFinancialFiles] = useState<File[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const userId = localStorage.getItem("userId");

    const payload = {
      sellerId: Number(userId),
      category:
          category === "Other"
              ? String(form.get("otherCategory"))
              : String(form.get("category")),
      title: String(form.get("title")),
      description: String(form.get("description")),
      location: String(form.get("location")),
      address: String(form.get("address")),
      askingPrice: Number(form.get("askingPrice")),
      businessAgeYears: Number(form.get("businessAgeYears")),
      numberOfEmployees: Number(form.get("numberOfEmployees")),
      reasonForSelling: String(form.get("reasonForSelling")),
    };

    try {
      // Step 1: create the listing
      const result = await apiRequest<{ message: string; data: { id: number } }>(
          "/businesses",
          { method: "POST", body: JSON.stringify(payload) }
      );

      const businessId = result.data.id;

      // Step 2: upload files if any selected
      const hasFiles =
          imageFiles.length > 0 ||
          documentFiles.length > 0 ||
          financialFiles.length > 0;

      if (hasFiles) {
        const fileData = new FormData();
        imageFiles.forEach((f) => fileData.append("images", f));
        documentFiles.forEach((f) => fileData.append("documents", f));
        financialFiles.forEach((f) => fileData.append("financialReports", f));

        await apiUpload(`/businesses/${businessId}/files`, fileData);
      }

      setMessage(
          hasFiles
              ? `${result.message} Files uploaded successfully.`
              : result.message
      );
      formElement.reset();
      setCategory("");
      setImageFiles([]);
      setDocumentFiles([]);
      setFinancialFiles([]);
    } catch (error) {
      setMessage(
          error instanceof Error ? error.message : "Failed to create business"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
      <main className="max-w-2xl mx-auto bg-white mt-10 p-8 rounded-xl shadow-sm text-slate-950">
        <h1 className="text-3xl font-bold mb-6">Create Business Listing</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <select
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border p-3 rounded-md text-slate-950"
              required
          >
            <option value="">Select Business Category</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Grocery Shop">Grocery Shop</option>
            <option value="Salon">Salon</option>
            <option value="Hotel">Hotel</option>
            <option value="Online Business">Online Business</option>
            <option value="Clothing Store">Clothing Store</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Other">Other</option>
          </select>

          {category === "Other" && (
              <input
                  name="otherCategory"
                  placeholder="Enter Category"
                  className="w-full border p-3 rounded-md placeholder:text-slate-400"
                  required
              />
          )}

          <input
              name="title"
              placeholder="Business Title"
              className="w-full border p-3 rounded-md"
              required
          />

          <textarea
              name="description"
              placeholder="Business Description"
              className="w-full border p-3 rounded-md"
              rows={4}
              required
          />

          <input
              name="location"
              placeholder="Location"
              className="w-full border p-3 rounded-md"
              required
          />

          <input
              name="address"
              placeholder="Address"
              className="w-full border p-3 rounded-md"
          />

          <input
              name="askingPrice"
              type="number"
              placeholder="Asking Price (LKR)"
              className="w-full border p-3 rounded-md"
              required
          />

          <input
              name="businessAgeYears"
              type="number"
              placeholder="Business Age in Years"
              className="w-full border p-3 rounded-md"
          />

          <input
              name="numberOfEmployees"
              type="number"
              placeholder="Number of Employees"
              className="w-full border p-3 rounded-md"
          />

          <textarea
              name="reasonForSelling"
              placeholder="Reason for Selling"
              className="w-full border p-3 rounded-md"
              rows={3}
          />

          {/* ── File Uploads ── */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-5 bg-slate-50">
            <p className="font-medium text-slate-700">
              Attachments{" "}
              <span className="text-sm font-normal text-slate-400">— optional</span>
            </p>

            <FileDropZone
                label="Business photos"
                hint="Drop photos here or browse"
                sub="Multiple files allowed · max 20 MB each"
                accept="image/*"
                iconClass="text-blue-500 bg-blue-50"
                icon="📷"
                badge="JPG · PNG · WEBP"
                files={imageFiles}
                onAdd={(f) => setImageFiles((p) => [...p, ...f])}
                onRemove={(i) => setImageFiles((p) => p.filter((_, idx) => idx !== i))}
            />

            <FileDropZone
                label="Business documents"
                hint="Drop documents here or browse"
                sub="Licences, registrations, ownership docs"
                accept=".pdf,.doc,.docx,application/pdf,application/msword"
                iconClass="text-green-600 bg-green-50"
                icon="📄"
                badge="PDF · DOCX"
                files={documentFiles}
                onAdd={(f) => setDocumentFiles((p) => [...p, ...f])}
                onRemove={(i) => setDocumentFiles((p) => p.filter((_, idx) => idx !== i))}
            />

            <FileDropZone
                label="Financial reports"
                hint="Drop reports here or browse"
                sub="P&L statements, balance sheets, tax returns"
                accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                iconClass="text-amber-500 bg-amber-50"
                icon="📊"
                badge="PDF · XLSX"
                files={financialFiles}
                onAdd={(f) => setFinancialFiles((p) => [...p, ...f])}
                onRemove={(i) => setFinancialFiles((p) => p.filter((_, idx) => idx !== i))}
            />
          </div>

          <button
              disabled={submitting}
              className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
        </form>

        {message && (
            <p className="mt-4 text-sm text-slate-700">{message}</p>
        )}
      </main>
  );
}