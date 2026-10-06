import Link from "next/link";
import { SingleBusinessApiResponse, BusinessFile } from "@/types/business";
import SendInquiryButton from "@/components/SendInquiryButton";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

async function getBusiness(id: string) {
  try {
    const response = await fetch(`${API}/businesses/${id}`, { cache: "no-store" });
    if (!response.ok) return null;
    const result: SingleBusinessApiResponse = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

async function getFiles(id: string): Promise<BusinessFile[]> {
  try {
    const response = await fetch(`${API}/businesses/${id}/files`, { cache: "no-store" });
    if (!response.ok) return [];
    const result = await response.json();
    return result.data ?? [];
  } catch {
    return [];
  }
}

export default async function BusinessDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [business, files] = await Promise.all([getBusiness(id), getFiles(id)]);

  if (!business) {
    return (
      <main className="max-w-4xl mx-auto my-24 px-6 text-center">
        <div className="glass-panel p-12 rounded-3xl border border-white/5 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-[#8493a8]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Business Listing Not Found</h2>
          <p className="text-xs text-[#8493a8] mb-6">
            This listing may have been sold, unlisted, or is currently under verification audit.
          </p>
          <Link
            href="/businesses"
            className="inline-flex items-center gap-2 bg-[#00cfa8] text-[#070b14] px-5 py-2.5 rounded-xl font-semibold text-xs hover:bg-[#00e6bc] transition-all"
          >
            ← Return to Marketplace
          </Link>
        </div>
      </main>
    );
  }

  const images = files.filter((f) => f.fileType === "IMAGE");
  const documents = files.filter((f) => f.fileType === "DOCUMENT");
  const financial = files.filter((f) => f.fileType === "FINANCIAL_REPORT");

  const sellerInitials = (business.sellerName || "Seller")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-[#627288] mb-6 overflow-x-auto no-scrollbar whitespace-nowrap">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/businesses" className="hover:text-white transition-colors">Businesses</Link>
        <span>/</span>
        <span className="text-[#8493a8] truncate max-w-xs">{business.title}</span>
      </nav>

      {/* Main Grid: Details + Sticky Action Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
        {/* Left 2 Columns: Core Listing Memo */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* Title Header Card */}
          <div className="glass-panel p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="badge-emerald text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                {business.category}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00cfa8] bg-[#00cfa8]/10 px-3 py-1 rounded-full border border-[#00cfa8]/20">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Audited & Verified Listing
              </span>
              <span className="text-xs text-[#8493a8] ml-auto flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-[#52637a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {business.location}
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4 break-words">
              {business.title}
            </h1>

            <p className="text-xs sm:text-sm text-[#8493a8] flex flex-wrap items-center gap-3">
              <span>Managed by <strong className="text-white font-medium">{business.sellerName}</strong></span>
              {business.averageRating !== undefined && business.averageRating !== null && (
                <span className="flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">
                  <span className="text-amber-400 font-bold">★</span>
                  <span className="text-white font-bold">{business.averageRating.toFixed(1)}</span>
                  <span className="text-[#52637a]">({business.reviewCount} reviews)</span>
                </span>
              )}
            </p>
          </div>

          {/* Image Gallery */}
          {images.length > 0 ? (
            <div className="glass-panel p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/5 space-y-3">
              <a
                href={`${API}${images[0].url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative rounded-xl sm:rounded-2xl overflow-hidden group cursor-zoom-in"
              >
                <img
                  src={`${API}${images[0].url}`}
                  alt={images[0].originalName}
                  className="w-full h-60 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b14]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-xs font-semibold text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg">
                    Click to view full image
                  </span>
                </div>
              </a>

              {images.length > 1 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {images.slice(1, 5).map((img, i) => (
                    <a
                      key={img.id}
                      href={`${API}${img.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block rounded-xl overflow-hidden aspect-video border border-white/5 hover:border-[#00cfa8]/50 transition-colors"
                    >
                      <img
                        src={`${API}${img.url}`}
                        alt={img.originalName}
                        className="w-full h-full object-cover"
                      />
                      {i === 3 && images.length > 5 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-bold text-xs text-white">
                          +{images.length - 5} more
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-3 text-[#627288]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs text-[#8493a8]">No public facility photographs uploaded for this confidential listing.</p>
            </div>
          )}

          {/* Business Overview Narrative */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 space-y-4">
            <h2 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-[#00cfa8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Executive Summary & Business Overview
            </h2>
            <div className="text-sm text-[#8493a8] leading-relaxed whitespace-pre-line">
              {business.description}
            </div>
          </div>

          {/* Diligence Documents & Reports */}
          {(documents.length > 0 || financial.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-6">
              {/* General Documents */}
              {documents.length > 0 && (
                <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <span>📄</span> Verified Documents
                    </h3>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-[#8493a8]">
                      {documents.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={`${API}${doc.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#00cfa8]/30 transition-all group"
                      >
                        <span className="text-xs text-[#8493a8] group-hover:text-white truncate max-w-[200px]">
                          {doc.originalName}
                        </span>
                        <svg className="w-3.5 h-3.5 text-[#52637a] group-hover:text-[#00cfa8] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Reports */}
              {financial.length > 0 && (
                <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <span>📊</span> Audited Financials
                    </h3>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-[#8493a8]">
                      {financial.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {financial.map((doc) => (
                      <a
                        key={doc.id}
                        href={`${API}${doc.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#00cfa8]/30 transition-all group"
                      >
                        <span className="text-xs text-[#8493a8] group-hover:text-white truncate max-w-[200px]">
                          {doc.originalName}
                        </span>
                        <svg className="w-3.5 h-3.5 text-[#52637a] group-hover:text-[#00cfa8] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Column: Sticky Acquisition Card */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 sticky top-24 shadow-2xl">
            {/* Price block */}
            <div className="pb-6 border-b border-white/10">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#627288] block mb-1">
                Certified Asking Price
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#00cfa8] tabular-nums tracking-tight">
                LKR {business.askingPrice.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#52637a] mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00cfa8]" />
                Includes fixtures, verified customer base, & initial transition support.
              </p>
            </div>

            {/* Inquiry Action */}
            <SendInquiryButton businessId={business.id} />

            {/* Seller profile tile */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#627288] block">
                Listing Ownership
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#141f36] to-[#1e2f4d] border border-white/10 flex items-center justify-center font-bold text-xs text-[#00cfa8]">
                  {sellerInitials}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{business.sellerName}</h4>
                  <p className="text-[10px] text-[#00cfa8] flex items-center gap-1">
                    <span>✓</span> Verified Platform Seller
                  </p>
                </div>
              </div>
            </div>

            {/* Platform Guarantees */}
            <div className="pt-6 border-t border-white/10 space-y-2.5 text-xs text-[#8493a8]">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#00cfa8] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Confidential Diligence Protected</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#00cfa8] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>Fast Seller Response Track</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}