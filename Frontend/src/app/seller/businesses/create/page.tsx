"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest, apiUpload } from "@/lib/api";
import SellerSidebar from "@/components/SellerSidebar";



// ── Helpers ─────────────────────────────────────────────────────────────────
function initials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ── FileDropZone ─────────────────────────────────────────────────────────────
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

function FileDropZone({
  label, hint, sub, accept, iconClass, icon, badge, files, onAdd, onRemove,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

  const addUnique = (incoming: File[]) => {
    const valid: File[] = [];
    for (const f of incoming) {
      if (f.size > MAX_FILE_SIZE) {
        alert(`File "${f.name}" (${fmtSize(f.size)}) exceeds the maximum allowed limit of 20 MB.`);
        continue;
      }
      if (!files.find((x) => x.name === f.name && x.size === f.size)) {
        valid.push(f);
      }
    }
    if (valid.length) onAdd(valid);
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
        className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          dragging
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

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CreateBusinessPage() {
  const router = useRouter();

  // Sidebar / user state
  const [profile, setProfile] = useState<{ fullName: string; verificationStatus: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form state
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [submitting, setSubmitting] = useState(false);
  const [createdBusinessId, setCreatedBusinessId] = useState<number | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [financialFiles, setFinancialFiles] = useState<File[]>([]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch profile + categories
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      apiRequest<{ fullName: string; verificationStatus: string }>(`/seller/profile/${userId}`)
        .then(setProfile)
        .catch(() => {});
    }
    apiRequest<{ data: { id: number; name: string }[] }>("/categories")
      .then((r) => setCategories(r.data || []))
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  }

  const inputClass =
    "w-full bg-[#121c32] border border-white/10 text-[#c7d2e0] placeholder:text-[#4f6380] p-3 rounded-lg focus:outline-none focus:border-[#00cfa8]/50 transition-colors";

  async function handleRetryUpload() {
    if (!createdBusinessId) return;
    setSubmitting(true);
    setMessage("");
    try {
      const fileData = new FormData();
      imageFiles.forEach((f) => fileData.append("images", f));
      documentFiles.forEach((f) => fileData.append("documents", f));
      financialFiles.forEach((f) => fileData.append("financialReports", f));
      await apiUpload(`/businesses/${createdBusinessId}/files`, fileData);
      router.push("/seller/businesses");
    } catch (uploadErr: unknown) {
      const errMsg = uploadErr instanceof Error ? uploadErr.message : "Upload error";
      setUploadFailed(true);
      setMessage(
        `Uploading attachments to listing #${createdBusinessId} failed: ${errMsg}. Please check file limits and retry, or proceed to My Listings.`
      );
      setMessageType("error");
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setUploadFailed(false);

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

    let businessId = createdBusinessId;
    if (!businessId) {
      try {
        const result = await apiRequest<{ message: string; data: { id: number } }>(
          "/businesses",
          { method: "POST", body: JSON.stringify(payload) }
        );
        businessId = result.data.id;
        setCreatedBusinessId(businessId);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Failed to create listing";
        setMessage(errMsg);
        setMessageType("error");
        setSubmitting(false);
        return;
      }
    }

    const hasFiles =
      imageFiles.length > 0 || documentFiles.length > 0 || financialFiles.length > 0;

    if (hasFiles && businessId) {
      try {
        const fileData = new FormData();
        imageFiles.forEach((f) => fileData.append("images", f));
        documentFiles.forEach((f) => fileData.append("documents", f));
        financialFiles.forEach((f) => fileData.append("financialReports", f));
        await apiUpload(`/businesses/${businessId}/files`, fileData);
      } catch (uploadErr: unknown) {
        const errMsg = uploadErr instanceof Error ? uploadErr.message : "Upload error";
        setUploadFailed(true);
        setMessage(
          `Listing created successfully (ID: #${businessId}), but uploading attachments failed: ${errMsg}. You can retry uploading attachments below or manage your listing from My Listings.`
        );
        setMessageType("error");
        setSubmitting(false);
        return;
      }
    }

    router.push("/seller/businesses");
  }

  return (
    <div className="min-h-screen bg-[#080c15] text-[#c7d2e0] flex relative overflow-x-hidden">
      <SellerSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        profile={profile}
      />

      {/* ── Main column ── */}
      <div className="flex-1 ml-0 lg:ml-[248px] flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-8 lg:px-10 py-4 sm:py-5 border-b border-white/5 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[#8092ab] hover:text-white rounded-lg border border-white/10 shrink-0"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="text-[11px] tracking-[0.15em] text-[#4f6380]">MY LISTING</div>
              <div className="text-xs sm:text-sm text-[#8092ab] mt-0.5 truncate">Create a new business listing</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            {/* Bell */}
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[#8092ab]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 touch-target"
              >
                <div className="w-8 h-8 rounded-full bg-[#057a6b] text-white text-xs font-semibold flex items-center justify-center">
                  {initials(profile?.fullName)}
                </div>
                <span className="hidden sm:inline text-sm text-[#d8e4f0]">
                  {profile?.fullName ?? "Seller"}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-56 bg-[#121c32] border border-white/10 rounded-xl shadow-lg overflow-hidden z-20">
                  <Link
                    href="/seller/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-[#c7d2e0] hover:bg-white/[0.04] hover:text-[#00cfa8] transition-colors"
                  >
                    Profile &amp; Verification
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 text-sm text-[#c7d2e0] hover:bg-white/[0.04] hover:text-red-400 transition-colors border-t border-white/5"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#d8e4f0] tracking-wide">
                NEW LISTING
              </h1>
              <p className="text-[#4f6380] text-xs sm:text-sm mt-1">
                Fill in the details below to submit your business for review
              </p>
            </div>
            <Link
              href="/seller/businesses"
              className="inline-flex items-center justify-center text-sm text-[#8092ab] hover:text-[#c7d2e0] border border-white/10 px-4 py-2 rounded-lg transition-colors min-h-[40px] shrink-0"
            >
              ← Back to Listings
            </Link>
          </div>

          <div className="bg-[#0d1220] border border-white/5 rounded-2xl p-4 sm:p-8 max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Category */}
              <div>
                <label className="block text-xs tracking-[0.12em] text-[#4f6380] mb-2">
                  BUSINESS CATEGORY
                </label>
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
              </div>

              {category === "Other" && (
                <div>
                  <label className="block text-xs tracking-[0.12em] text-[#4f6380] mb-2">
                    SPECIFY CATEGORY
                  </label>
                  <input
                    name="otherCategory"
                    placeholder="Enter category name"
                    className={inputClass}
                    required
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs tracking-[0.12em] text-[#4f6380] mb-2">
                  BUSINESS TITLE
                </label>
                <input
                  name="title"
                  placeholder="Enter business title"
                  className={inputClass}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs tracking-[0.12em] text-[#4f6380] mb-2">
                  DESCRIPTION
                </label>
                <textarea
                  name="description"
                  placeholder="Describe your business..."
                  className={inputClass}
                  rows={4}
                  required
                />
              </div>

              {/* Location + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-[0.12em] text-[#4f6380] mb-2">
                    LOCATION
                  </label>
                  <input
                    name="location"
                    placeholder="City / District"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-[0.12em] text-[#4f6380] mb-2">
                    ADDRESS
                  </label>
                  <input
                    name="address"
                    placeholder="Street address"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Asking Price */}
              <div>
                <label className="block text-xs tracking-[0.12em] text-[#4f6380] mb-2">
                  ASKING PRICE (LKR)
                </label>
                <input
                  name="askingPrice"
                  type="number"
                  placeholder="e.g. 5000000"
                  className={inputClass}
                  required
                />
              </div>

              {/* Age + Employees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-[0.12em] text-[#4f6380] mb-2">
                    BUSINESS AGE (YEARS)
                  </label>
                  <input
                    name="businessAgeYears"
                    type="number"
                    placeholder="e.g. 3"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-[0.12em] text-[#4f6380] mb-2">
                    NUMBER OF EMPLOYEES
                  </label>
                  <input
                    name="numberOfEmployees"
                    type="number"
                    placeholder="e.g. 12"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Reason for selling */}
              <div>
                <label className="block text-xs tracking-[0.12em] text-[#4f6380] mb-2">
                  REASON FOR SELLING
                </label>
                <textarea
                  name="reasonForSelling"
                  placeholder="Why are you selling this business?"
                  className={inputClass}
                  rows={3}
                />
              </div>

              {/* ── File Uploads ── */}
              <div className="border border-white/10 rounded-xl p-5 space-y-5 bg-[#080c15]">
                <p className="text-xs tracking-[0.12em] text-[#4f6380]">
                  ATTACHMENTS{" "}
                  <span className="text-[#4f6380]/60 normal-case tracking-normal">— optional</span>
                </p>

                <FileDropZone
                  label="Business photos"
                  hint="Drop photos here or browse"
                  sub="Multiple photos allowed · max 20 MB each"
                  accept="image/jpeg,image/png,image/webp"
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
                  sub="Licences, registrations, ownership docs (PDF · max 20 MB each)"
                  accept="application/pdf"
                  iconClass="text-[#00cfa8] bg-[#00cfa8]/20"
                  icon="📄"
                  badge="PDF"
                  files={documentFiles}
                  onAdd={(f) => setDocumentFiles((p) => [...p, ...f])}
                  onRemove={(i) => setDocumentFiles((p) => p.filter((_, idx) => idx !== i))}
                />

                <FileDropZone
                  label="Financial reports"
                  hint="Drop reports here or browse"
                  sub="P&L statements, balance sheets, tax returns (PDF · max 20 MB each)"
                  accept="application/pdf"
                  iconClass="text-[#f5a623] bg-[#f5a623]/20"
                  icon="📊"
                  badge="PDF"
                  files={financialFiles}
                  onAdd={(f) => setFinancialFiles((p) => [...p, ...f])}
                  onRemove={(i) => setFinancialFiles((p) => p.filter((_, idx) => idx !== i))}
                />
              </div>

              {/* Status message */}
              {message && (
                <div
                  className={`text-sm px-4 py-3 rounded-lg border ${
                    messageType === "success"
                      ? "text-[#00cfa8] bg-[#00cfa8]/5 border-[#00cfa8]/20"
                      : "text-red-400 bg-red-500/5 border-red-500/20"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Submit or Retry Actions */}
              {createdBusinessId && uploadFailed ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleRetryUpload}
                    disabled={submitting}
                    className="flex-1 bg-[#00cfa8] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#00e6bc] disabled:opacity-50 transition-colors tracking-wide text-center"
                  >
                    {submitting ? "Retrying Upload..." : `RETRY UPLOADING ATTACHMENTS (ID: #${createdBusinessId})`}
                  </button>
                  <Link
                    href="/seller/businesses"
                    className="px-6 py-3 rounded-lg font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors text-center flex items-center justify-center"
                  >
                    GO TO MY LISTINGS
                  </Link>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#00cfa8] text-[#080c15] p-3 rounded-lg font-semibold hover:bg-[#00e6bc] disabled:opacity-50 transition-colors tracking-wide"
                >
                  {submitting ? "Submitting..." : "SUBMIT FOR REVIEW"}
                </button>
              )}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}