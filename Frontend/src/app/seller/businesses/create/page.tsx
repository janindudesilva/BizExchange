"use client";

import { useEffect, useRef, useState } from "react";
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
          <span className="text-sm font-medium text-[#8092ab]">{label}</span>
          <span className="text-xs text-[#4f6380] bg-[#0d1220] border border-white/10 px-2 py-0.5 rounded-full">
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
                ? "border-[#00cfa8]/50 bg-[#0c212a]"
                : "border-white/10 hover:border-[#00cfa8]/30 hover:bg-white/[0.02]"
            }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${iconClass}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-[#c7d2e0]">{hint}</p>
            <p className="text-xs text-[#4f6380] mt-0.5">{sub}</p>
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
                      className="flex items-center gap-2 bg-[#0d1220] border border-white/10 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-[#c7d2e0] flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-[#4f6380] flex-shrink-0">{fmtSize(f.size)}</span>
                    <button
                        type="button"
                        onClick={() => onRemove(i)}
                        className="w-5 h-5 flex items-center justify-center rounded-full text-[#4f6380] hover:bg-red-500/20 hover:text-red-400 transition-colors flex-shrink-0"
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
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [financialFiles, setFinancialFiles] = useState<File[]>([]);

  useEffect(() => {
    // Note: using client-side mount fetch
    async function fetchCats() {
      try {
        const response = await apiRequest<{ data: { id: number; name: string }[] }>("/categories");
        setCategories(response.data || []);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    fetchCats();
  }, []);

  const inputClass = "w-full bg-[#121c32] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 transition-colors";

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
      <main className="max-w-2xl mx-auto mt-10 px-4">
        <div className="bg-[#0d1220] border border-white/5 p-8 rounded-2xl">
          <h1 className="text-2xl font-bold mb-6 text-[#d8e4f0] tracking-wide">CREATE BUSINESS LISTING</h1>

          <form onSubmit={handleSubmit} className="space-y-4">

            <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
                required
            >
              <option value="">Select Business Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>

            {category === "Other" && (
                <input
                    name="otherCategory"
                    placeholder="Enter Category"
                    className={inputClass}
                    required
                />
            )}

            <input
                name="title"
                placeholder="Business Title"
                className={inputClass}
                required
            />

            <textarea
                name="description"
                placeholder="Business Description"
                className={inputClass}
                rows={4}
                required
            />

            <input
                name="location"
                placeholder="Location"
                className={inputClass}
                required
            />

            <input
                name="address"
                placeholder="Address"
                className={inputClass}
            />

            <input
                name="askingPrice"
                type="number"
                placeholder="Asking Price (LKR)"
                className={inputClass}
                required
            />

            <input
                name="businessAgeYears"
                type="number"
                placeholder="Business Age in Years"
                className={inputClass}
            />

            <input
                name="numberOfEmployees"
                type="number"
                placeholder="Number of Employees"
                className={inputClass}
            />

            <textarea
                name="reasonForSelling"
                placeholder="Reason for Selling"
                className={inputClass}
                rows={3}
            />

            {/* ── File Uploads ── */}
            <div className="border border-white/10 rounded-xl p-5 space-y-5 bg-[#080c15]">
              <p className="font-medium text-[#c7d2e0]">
                Attachments{" "}
                <span className="text-sm font-normal text-[#4f6380]">— optional</span>
              </p>

              <FileDropZone
                  label="Business photos"
                  hint="Drop photos here or browse"
                  sub="Multiple files allowed · max 20 MB each"
                  accept="image/*"
                  iconClass="text-blue-400 bg-blue-500/20"
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
                  iconClass="text-[#00cfa8] bg-[#00cfa8]/20"
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
                  iconClass="text-[#f5a623] bg-[#f5a623]/20"
                  icon="📊"
                  badge="PDF · XLSX"
                  files={financialFiles}
                  onAdd={(f) => setFinancialFiles((p) => [...p, ...f])}
                  onRemove={(i) => setFinancialFiles((p) => p.filter((_, idx) => idx !== i))}
              />
            </div>

            <button
                disabled={submitting}
                className="w-full bg-[#00cfa8] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#00e6bc] disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </form>

          {message && (
              <p className="mt-4 text-sm text-[#8092ab]">{message}</p>
          )}
        </div>
      </main>
  );
}