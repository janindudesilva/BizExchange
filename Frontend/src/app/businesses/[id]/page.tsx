import { SingleBusinessApiResponse, BusinessFile } from "@/types/business";

const API = "http://localhost:8080/api";

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
            <main className="max-w-5xl mx-auto mt-16 px-6">
                <p className="text-slate-400 text-center">Business not found.</p>
            </main>
        );
    }

    const images = files.filter((f) => f.fileType === "IMAGE");
    const documents = files.filter((f) => f.fileType === "DOCUMENT");
    const financial = files.filter((f) => f.fileType === "FINANCIAL_REPORT");

    return (
        <main className="min-h-screen bg-slate-50">

            {/* ── Hero: two-column ── */}
            <section className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex flex-col lg:flex-row gap-10 items-start">

                    {/* Left — info */}
                    <div className="flex-1 min-w-0">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-4">
              {business.category}
            </span>

                        <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-3">
                            {business.title}
                        </h1>

                        <p className="text-slate-500 text-sm mb-6">
                            📍 {business.location} &nbsp;·&nbsp; Listed by{" "}
                            <span className="font-medium text-slate-700">{business.sellerName}</span>
                        </p>

                        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Asking Price</p>
                            <p className="text-3xl font-bold text-green-600">
                                LKR {business.askingPrice.toLocaleString()}
                            </p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
                            <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">About this Business</p>
                            <p className="text-slate-700 leading-7 text-sm">{business.description}</p>
                        </div>

                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors">
                            Send Inquiry
                        </button>
                    </div>

                    {/* Right — image gallery */}
                    {images.length > 0 && (
                        <div className="w-full lg:w-[480px] flex-shrink-0">
                            {/* Main image */}
                            <a
                                href={`${API}${images[0].url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <img
                                    src={`${API}${images[0].url}`}
                                    alt={images[0].originalName}
                                    className="w-full h-72 object-cover rounded-2xl shadow-md hover:opacity-95 transition-opacity"
                                />
                            </a>

                            {/* Thumbnails */}
                            {images.length > 1 && (
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    {images.slice(1, 4).map((img, i) => (
                                        <a
                                            key={img.id}
                                            href={`${API}${img.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="relative block"
                                        >
                                            <img
                                                src={`${API}${img.url}`}
                                                alt={img.originalName}
                                                className="w-full h-24 object-cover rounded-xl hover:opacity-90 transition-opacity"
                                            />
                                            {/* "+N more" overlay on last thumbnail if there are more */}
                                            {i === 2 && images.length > 4 && (
                                                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            +{images.length - 4} more
                          </span>
                                                </div>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Right — placeholder if no images */}
                    {images.length === 0 && (
                        <div className="w-full lg:w-[480px] flex-shrink-0 h-72 bg-slate-100 rounded-2xl flex items-center justify-center border border-dashed border-slate-300">
                            <p className="text-slate-400 text-sm">No photos uploaded</p>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Documents & Financial Reports ── */}
            {(documents.length > 0 || financial.length > 0) && (
                <section className="max-w-6xl mx-auto px-6 pb-16">
                    <div className="grid md:grid-cols-2 gap-6">

                        {/* Business Documents */}
                        {documents.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xl">📄</span>
                                    <h2 className="font-semibold text-slate-800">Business Documents</h2>
                                    <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {documents.length} file{documents.length > 1 ? "s" : ""}
                  </span>
                                </div>
                                <div className="space-y-2">
                                    {documents.map((doc) => (
                                        <a
                                            key={doc.id}
                                            href={`${API}${doc.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all group"
                                        >
                                            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm">📋</span>
                                            </div>
                                            <span className="text-sm text-slate-700 flex-1 truncate group-hover:text-blue-700">
                        {doc.originalName}
                      </span>
                                            <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Financial Reports */}
                        {financial.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xl">📊</span>
                                    <h2 className="font-semibold text-slate-800">Financial Reports</h2>
                                    <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {financial.length} file{financial.length > 1 ? "s" : ""}
                  </span>
                                </div>
                                <div className="space-y-2">
                                    {financial.map((doc) => (
                                        <a
                                            key={doc.id}
                                            href={`${API}${doc.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-green-50 border border-transparent hover:border-green-200 transition-all group"
                                        >
                                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm">💹</span>
                                            </div>
                                            <span className="text-sm text-slate-700 flex-1 truncate group-hover:text-green-700">
                        {doc.originalName}
                      </span>
                                            <svg className="w-4 h-4 text-slate-400 group-hover:text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </section>
            )}

        </main>
    );
}