import Link from "next/link";

const stats = [
  { label: "Listed Asset Value", value: "LKR 950M+", suffix: "" },
  { label: "Verified Listings", value: "100%", suffix: "" },
  { label: "Deal Multiple Range", value: "2.8–4.5×", suffix: "" },
  { label: "Confidentiality", value: "Bank Grade", suffix: "" },
];

const categories = [
  {
    id: 1,
    name: "Tech & SaaS",
    desc: "Recurring revenue web apps, cloud platforms, and digital micro-SaaS.",
    tag: "+34% YoY",
    variant: "accent" as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 2,
    name: "E-Commerce & DTC",
    desc: "Shopify stores, Amazon FBA brands, and established dropship operations.",
    tag: "+22% YoY",
    variant: "default" as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    id: 3,
    name: "Retail & Supermarkets",
    desc: "High foot-traffic brick-and-mortar storefronts, franchises, and minimarts.",
    tag: "Stable Cashflow",
    variant: "default" as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 4,
    name: "Food & Beverage",
    desc: "Cafes, specialty restaurants, central kitchens, and catering units.",
    tag: "Prime Locations",
    variant: "blue" as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 5,
    name: "Healthcare & Clinics",
    desc: "Pharmacies, diagnostic centers, wellness spas, and dental clinics.",
    tag: "High Retention",
    variant: "default" as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 6,
    name: "Services & Logistics",
    desc: "B2B agencies, transport fleets, supply chains, and maintenance companies.",
    tag: "Contract Backed",
    variant: "default" as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
];

const categoryCardStyles = {
  accent: {
    wrapper: "bg-gradient-to-br from-[#00cfa8]/12 via-[#0c1a2f] to-[#0a1625] border-[#00cfa8]/20",
    iconWrapper: "bg-[#00cfa8]/10 border-[#00cfa8]/25",
    icon: "text-[#00cfa8]",
    title: "group-hover:text-[#00cfa8]",
    tag: "text-[#00cfa8] bg-[#00cfa8]/10 border-[#00cfa8]/20",
    footer: "border-white/[0.06] text-[#52637a] group-hover:text-[#8493a8]",
  },
  blue: {
    wrapper: "bg-gradient-to-br from-[#3b82f6]/10 via-[#0c1a2f] to-[#0a1625] border-blue-500/20",
    iconWrapper: "bg-blue-500/10 border-blue-500/25",
    icon: "text-[#60a5fa]",
    title: "group-hover:text-[#60a5fa]",
    tag: "text-[#60a5fa] bg-blue-500/10 border-blue-500/20",
    footer: "border-white/[0.06] text-[#52637a] group-hover:text-[#8493a8]",
  },
  default: {
    wrapper: "bg-[#0c1322]/80 border-white/[0.07]",
    iconWrapper: "bg-white/[0.04] border-white/10",
    icon: "text-[#00cfa8]",
    title: "group-hover:text-[#00cfa8]",
    tag: "text-[#00cfa8] bg-[#00cfa8]/10 border-[#00cfa8]/20",
    footer: "border-white/[0.06] text-[#52637a] group-hover:text-[#8493a8]",
  },
};

const buyerSteps = [
  { n: "01", title: "Search Verified Listings", body: "Filter by verified asking price, industry, geographic zone, and financial history." },
  { n: "02", title: "Confidential Due Diligence", body: "Review uploaded tax returns, revenue audits, and seller credentials verified by our officers." },
  { n: "03", title: "Direct Inquiries & Deal Close", body: "Send structured inquiries to the seller with guaranteed privacy and zero broker fees." },
];

const sellerSteps = [
  { n: "01", title: "Submit Your Listing", body: "Input financials, business age, assets, and upload supporting documents securely." },
  { n: "02", title: "Officer Verification", body: "A dedicated Verification Officer reviews your legitimacy, building instant buyer trust." },
  { n: "03", title: "Receive Qualified Inquiries", body: "Screen inquiries from funded buyers, schedule confidential discussions, and negotiate." },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">

      {/* ─────────────────────────────────────────
          HERO — Left-Aligned Split Layout
          ───────────────────────────────────────── */}
      <section className="relative px-4 sm:px-8 lg:px-16 max-w-[1600px] mx-auto pt-10 pb-12 md:pt-14 md:pb-16">
        {/* Ambient glow */}
        <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-[#00cfa8]/06 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-blue-500/04 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px] gap-10 lg:gap-16 items-center">
          {/* Left — Text Content */}
          <div className="max-w-2xl">
            {/* Eyebrow — one per page, here only */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-[11px] font-semibold text-[#00cfa8] mb-5 border border-[#00cfa8]/20 shadow-[0_0_10px_rgba(0,207,168,0.1)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00cfa8] animate-pulse flex-shrink-0" />
              <span>Sri Lanka&apos;s Premier Business Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-5">
              Buy & Sell Profitable{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00cfa8] via-[#22d3ee] to-[#38bdf8]">
                Businesses
              </span>{" "}
              <br className="hidden sm:block" />
              With Verified Financials
            </h1>

            <p className="text-base text-[#8493a8] leading-relaxed mb-7 max-w-lg">
              Skip brokers and hidden debts. BizExchange connects serious buyers with vetted business owners through transparent documentation, officer audits, and confidential inquiries.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/businesses"
                className="btn-primary gap-2 !px-6 !py-3 !text-sm"
              >
                <span>Explore Businesses</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                href="/register"
                className="btn-ghost !px-6 !py-3 !text-sm gap-2"
              >
                <span>List Your Business</span>
                <span className="text-[#00cfa8] text-[10px] font-bold uppercase tracking-wide">Free</span>
              </Link>
            </div>
          </div>

          {/* Right — Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.07] relative overflow-hidden group hover:border-[#00cfa8]/20 transition-colors"
              >
                {/* subtle inner glow on hover */}
                <div className="absolute inset-0 bg-[#00cfa8]/0 group-hover:bg-[#00cfa8]/[0.03] transition-colors rounded-2xl" />
                <div className="relative">
                  <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-[#8493a8] tabular-nums tracking-tight mb-1">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#00cfa8]">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          CATEGORY EXPLORER
          ───────────────────────────────────────── */}
      <section className="py-12 sm:py-16 px-4 sm:px-8 lg:px-16 max-w-[1600px] mx-auto border-t border-white/[0.05]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Explore Active Business Categories
          </h2>
          <Link
            href="/businesses"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00cfa8] hover:text-[#00e6bc] transition-colors flex-shrink-0"
          >
            <span>View All Listings</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const s = categoryCardStyles[cat.variant];
            return (
              <Link
                key={cat.id}
                href={`/businesses?categoryId=${cat.id}`}
                className={`group p-5 sm:p-6 rounded-2xl border backdrop-blur-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)] ${s.wrapper}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${s.iconWrapper} ${s.icon}`}>
                      {cat.icon}
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.tag}`}>
                      {cat.tag}
                    </span>
                  </div>
                  <h3 className={`text-base font-bold text-white transition-colors mb-1.5 ${s.title}`}>
                    {cat.name}
                  </h3>
                  <p className="text-sm text-[#8493a8] leading-relaxed">
                    {cat.desc}
                  </p>
                </div>

                <div className={`mt-5 pt-4 border-t flex items-center justify-between text-xs transition-colors ${s.footer}`}>
                  <span>Browse inventory</span>
                  <svg className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────
          HOW IT WORKS — Dual Track
          ───────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 sm:px-8 lg:px-16 max-w-[1600px] mx-auto border-t border-white/[0.05]">
        <div className="max-w-xl mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
            A Transparent Process for Buyers and Sellers
          </h2>
          <p className="text-sm text-[#8493a8] leading-relaxed">
            We replace informal classified ads with institutional verification standards and confidential deal rooms.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* For Buyers */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/[0.07] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#00cfa8]/05 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00cfa8] bg-[#00cfa8]/10 px-3 py-1 rounded-full mb-6 border border-[#00cfa8]/20">
                For Investors &amp; Buyers
              </div>
              <h3 className="text-xl font-bold text-white mb-7">
                Acquire a cashflow-positive business with certainty
              </h3>
              <div className="space-y-6">
                {buyerSteps.map((step) => (
                  <div key={step.n} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-[#00cfa8]/10 border border-[#00cfa8]/20 flex items-center justify-center text-xs font-black text-[#00cfa8] flex-shrink-0 tabular-nums">
                      {step.n}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">{step.title}</h4>
                      <p className="text-sm text-[#8493a8] leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <Link href="/businesses" className="inline-flex items-center gap-2 text-sm font-semibold text-[#00cfa8] hover:text-[#00e6bc] transition-colors">
                  <span>Browse active opportunities</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* For Sellers */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/[0.07] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/05 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#60a5fa] bg-blue-500/10 px-3 py-1 rounded-full mb-6 border border-blue-500/20">
                For Business Owners
              </div>
              <h3 className="text-xl font-bold text-white mb-7">
                Exit your venture at maximum market valuation
              </h3>
              <div className="space-y-6">
                {sellerSteps.map((step) => (
                  <div key={step.n} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs font-black text-[#60a5fa] flex-shrink-0 tabular-nums">
                      {step.n}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">{step.title}</h4>
                      <p className="text-sm text-[#8493a8] leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <Link href="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-[#60a5fa] hover:text-blue-400 transition-colors">
                  <span>Register as a Seller</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          TRUST & SECURITY BANNER
          ───────────────────────────────────────── */}
      <section className="py-12 sm:py-16 px-4 sm:px-8 lg:px-16 max-w-[1600px] mx-auto">
        <div className="relative rounded-3xl overflow-hidden border border-[#00cfa8]/15 bg-gradient-to-br from-[#0c1a2e] via-[#0e1f35] to-[#0a1622]">
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-grid-lines opacity-60 pointer-events-none" />
          {/* Accent glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#00cfa8]/08 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-7 sm:p-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 leading-tight max-w-2xl">
              Built for Confidentiality, Legality, and High-Stakes Transactions
            </h2>
            <p className="text-sm sm:text-base text-[#8493a8] mb-10 leading-relaxed max-w-xl">
              Every business listed on BizExchange passes through multi-layer verification before going public. Financial data is held confidentially, and all inquiry threads are private.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/[0.08]">
              {[
                {
                  title: "Human Officer Audits",
                  body: "Every seller identity and registration record is inspected by a dedicated officer.",
                  icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                },
                {
                  title: "No Blind Bidding",
                  body: "Clear asking prices and honest disclosures from sellers from day one.",
                  icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                },
                {
                  title: "Dedicated Support",
                  body: "Resolution officers available throughout the entire inquiry and negotiation process.",
                  icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
                },
              ].map(({ title, body, icon }) => (
                <div key={title}>
                  <div className="w-8 h-8 rounded-lg bg-[#00cfa8]/10 border border-[#00cfa8]/20 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4 text-[#00cfa8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">{title}</h4>
                  <p className="text-sm text-[#8493a8] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          BOTTOM CTA
          ───────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[200px] bg-[#00cfa8]/06 blur-[100px] rounded-full" />
        </div>
        <div className="relative max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Start Your Business Transition Today
          </h2>
          <p className="text-sm text-[#8493a8] mb-8 leading-relaxed">
            Join thousands of entrepreneurs, investors, and business founders already transacting securely on BizExchange.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="relative glow-ring">
              <Link
                href="/businesses"
                className="btn-primary !px-8 !py-3.5 !text-sm !rounded-xl"
              >
                Browse Marketplace
              </Link>
            </div>
            <Link
              href="/register"
              className="btn-ghost !px-8 !py-3.5 !text-sm !rounded-xl"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
