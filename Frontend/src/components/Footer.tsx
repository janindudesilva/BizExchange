"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Hide the global marketing footer on portal pages with fixed sidebars
  const isPortal =
    pathname.startsWith("/buyer/dashboard") ||
    pathname.startsWith("/seller");

  if (isPortal) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-[#04070e] text-[#8493a8] text-sm relative overflow-hidden">
      {/* Subtle top gradient accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#00cfa8]/30 to-transparent" />

      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-5">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00cfa8] to-[#00b28e] flex items-center justify-center font-black text-[#070b14] text-base shadow-[0_0_16px_rgba(0,207,168,0.3)] group-hover:shadow-[0_0_22px_rgba(0,207,168,0.45)] transition-all">
                B
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Biz<span className="text-[#00cfa8]">Exchange</span>
              </span>
            </Link>

            <p className="text-[#8493a8] text-sm max-w-[340px] leading-relaxed">
              The verified marketplace to buy, sell, and invest in profitable small businesses. Streamlined due diligence, verified financial data, and confidential deal rooms.
            </p>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-3 text-[11px] text-[#52637a]">
              {[
                { dot: true, label: "Verified Sellers" },
                { dot: false, label: "Confidential Workflow" },
                { dot: false, label: "Direct Inquiries" },
              ].map(({ dot, label }, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {dot && <span className="w-1.5 h-1.5 rounded-full bg-[#00cfa8] flex-shrink-0" />}
                  {!dot && i > 0 && <span className="text-[#1e2d45]">•</span>}
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Column 1: Marketplace */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#c8d8ec] mb-5">
              Marketplace
            </h3>
            <ul className="space-y-3">
              <li><Link href="/businesses" className="hover:text-[#00cfa8] transition-colors">All Businesses</Link></li>
              <li><Link href="/businesses?categoryId=1" className="hover:text-[#00cfa8] transition-colors">Tech &amp; SaaS</Link></li>
              <li><Link href="/businesses?categoryId=2" className="hover:text-[#00cfa8] transition-colors">E-Commerce</Link></li>
              <li><Link href="/businesses?categoryId=3" className="hover:text-[#00cfa8] transition-colors">Retail &amp; Stores</Link></li>
              <li><Link href="/favorites" className="hover:text-[#00cfa8] transition-colors">Saved Watchlist</Link></li>
            </ul>
          </div>

          {/* Column 2: Entrepreneurs */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#c8d8ec] mb-5">
              For Entrepreneurs
            </h3>
            <ul className="space-y-3">
              <li><Link href="/register" className="hover:text-[#00cfa8] transition-colors">List Your Business</Link></li>
              <li><Link href="/seller/dashboard" className="hover:text-[#00cfa8] transition-colors">Seller Dashboard</Link></li>
              <li><Link href="/buyer/dashboard" className="hover:text-[#00cfa8] transition-colors">Buyer Dashboard</Link></li>
              <li><Link href="/inquiries" className="hover:text-[#00cfa8] transition-colors">Manage Inquiries</Link></li>
            </ul>
          </div>

          {/* Column 3: Trust */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#c8d8ec] mb-5">
              Trust &amp; Support
            </h3>
            <ul className="space-y-3">
              <li><Link href="/support" className="hover:text-[#00cfa8] transition-colors">Help &amp; Support</Link></li>
              <li><Link href="/verification-officer/dashboard" className="hover:text-[#00cfa8] transition-colors">Verification Portal</Link></li>
              <li><Link href="/admin/dashboard" className="hover:text-[#00cfa8] transition-colors">Admin Console</Link></li>
              <li><Link href="/change-password" className="hover:text-[#00cfa8] transition-colors">Security Settings</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#3d5270]">
          <p>© {new Date().getFullYear()} BizExchange. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span className="hover:text-[#8493a8] cursor-pointer transition-colors">Confidentiality Policy</span>
            <span className="hover:text-[#8493a8] cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-[#8493a8] cursor-pointer transition-colors">Security Practices</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
