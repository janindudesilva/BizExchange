"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FAQItem {
  id: string;
  category: "general" | "verification" | "buying" | "selling" | "security";
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: "faq-1",
    category: "general",
    question: "How does the BizExchange support ticket system work?",
    answer:
      "When you encounter an issue or have a query, you can submit a support ticket via 'Submit a Ticket'. A dedicated support agent will review your issue, provide responses, and update the ticket status in real-time. You can track all conversations and updates under 'My Tickets'.",
  },
  {
    id: "faq-2",
    category: "verification",
    question: "What documents are required to verify a business listing?",
    answer:
      "To ensure high trust and prevent fraud, our Verification Officers review official Business Registration (BR) certificates, tax compliance records, past 12–24 months profit & loss statements, and proof of operational ownership before any listing goes live.",
  },
  {
    id: "faq-3",
    category: "verification",
    question: "How long does business verification take?",
    answer:
      "Verification typically takes between 24 to 48 business hours. If our verification officers require supplementary documentation or clarification on financial metrics, you will receive an immediate notification.",
  },
  {
    id: "faq-4",
    category: "buying",
    question: "How do I request access to confidential financial documents?",
    answer:
      "To protect seller proprietary details, buyers must execute a digital Non-Disclosure Agreement (NDA) on the platform. Once approved by the seller or an officer, detailed disclosures and full data rooms are unlocked.",
  },
  {
    id: "faq-5",
    category: "buying",
    question: "Can I directly communicate with the seller?",
    answer:
      "Yes. Qualified buyers who have verified their profiles can send inquiries directly through the platform's secure inquiry module, schedule calls, and initiate structured offers.",
  },
  {
    id: "faq-6",
    category: "selling",
    question: "Can I list my business confidentially without revealing our brand name?",
    answer:
      "Yes. You can opt for a confidential teaser listing. Your business name, exact address, and proprietary metrics remain hidden from the public and are only disclosed to vetted buyers who sign an NDA.",
  },
  {
    id: "faq-7",
    category: "selling",
    question: "How is business valuation determined on BizExchange?",
    answer:
      "Valuations are typically calculated using industry standard multiples of SDE (Seller's Discretionary Earnings) or EBITDA, adjusted for recurring revenue consistency, asset value, growth rate, and customer concentration.",
  },
  {
    id: "faq-8",
    category: "security",
    question: "How does BizExchange safeguard sensitive user data?",
    answer:
      "All platform data is encrypted in transit and at rest using bank-grade protocols. Access to financial records and user identification documents is strictly role-gated and monitored through comprehensive audit logs.",
  },
  {
    id: "faq-9",
    category: "security",
    question: "What should I do if I suspect suspicious or unauthorized activity?",
    answer:
      "If you notice unrecognized activity or suspicious buyer/seller outreach, immediately submit an Urgent priority ticket under 'Submit a Ticket' or email our security desk at security@bizexchange.com.",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Questions" },
  { id: "general", label: "General & Tickets" },
  { id: "verification", label: "Verification" },
  { id: "buying", label: "Buying & NDAs" },
  { id: "selling", label: "Selling & Valuations" },
  { id: "security", label: "Security & Privacy" },
];

export default function SupportPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState<string | null>("faq-1");

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory =
      selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Hero Banner */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00cfa8]/10 border border-[#00cfa8]/20 text-[#00cfa8] text-xs font-semibold uppercase tracking-wider mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Help &amp; Support Hub
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
          How can we help you today?
        </h1>
        <p className="text-[#8493a8] text-base sm:text-lg max-w-2xl mx-auto mb-8">
          Find fast answers to common questions, get help with listings and transactions, or connect directly with our support team.
        </p>

        {/* Live Search Bar */}
        <div className="max-w-xl mx-auto relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#4f6380]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs, verification guides, ticket help..."
            className="w-full bg-[#0d1220] border border-white/10 text-[#d8e4f0] placeholder-[#4f6380] pl-11 pr-10 py-3.5 rounded-xl text-sm focus:outline-none focus:border-[#00cfa8]/60 focus:ring-1 focus:ring-[#00cfa8]/30 transition-all shadow-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8092ab] hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        {/* Submit Ticket */}
        <div className="bg-[#0e1628]/90 border border-white/10 hover:border-[#00cfa8]/40 rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-[#00cfa8]/5 flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#00cfa8]/10 border border-[#00cfa8]/20 flex items-center justify-center text-[#00cfa8] mb-4 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2 group-hover:text-[#00cfa8] transition-colors">
              Submit a Ticket
            </h2>
            <p className="text-sm text-[#8493a8] leading-relaxed mb-6">
              Need personalized assistance? Open a new ticket with our support agents.
            </p>
          </div>
          <Link
            href="/support/tickets/create"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#00cfa8] hover:bg-[#00e6bc] text-[#080c15] text-sm font-semibold transition-colors shadow-sm"
          >
            Create Ticket
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* My Tickets */}
        <div className="bg-[#0e1628]/90 border border-white/10 hover:border-blue-500/40 rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
              My Support Tickets
            </h2>
            <p className="text-sm text-[#8493a8] leading-relaxed mb-6">
              Track active responses, view resolution status, and reply to support staff.
            </p>
          </div>
          <Link
            href="/support/my-tickets"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#1e293b] hover:bg-[#27354a] text-[#d8e4f0] text-sm font-semibold transition-colors border border-white/5"
          >
            View My Tickets
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Verification Hub */}
        <div className="bg-[#0e1628]/90 border border-white/10 hover:border-purple-500/40 rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-purple-500/5 flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
              Listing Verification
            </h2>
            <p className="text-sm text-[#8493a8] leading-relaxed mb-6">
              Learn about our 100% verified asset standards and required audit files.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedCategory("verification");
              document.getElementById("faqs")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#1e293b] hover:bg-[#27354a] text-[#d8e4f0] text-sm font-semibold transition-colors border border-white/5"
          >
            Verification FAQs
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Browse Listings */}
        <div className="bg-[#0e1628]/90 border border-white/10 hover:border-amber-500/40 rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-amber-500/5 flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
              Explore Marketplace
            </h2>
            <p className="text-sm text-[#8493a8] leading-relaxed mb-6">
              Browse vetted business acquisitions across Tech, Retail, and Manufacturing.
            </p>
          </div>
          <Link
            href="/businesses"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#1e293b] hover:bg-[#27354a] text-[#d8e4f0] text-sm font-semibold transition-colors border border-white/5"
          >
            View Listings
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* FAQs Section */}
      <section id="faqs" className="mb-14">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[#8493a8]">
              Instant guidance on platform operations, NDAs, and deal safety.
            </p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#00cfa8] text-[#080c15] shadow-sm shadow-[#00cfa8]/20"
                  : "bg-[#0e1628] text-[#8493a8] hover:text-white hover:bg-[#151f38] border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Accordion List */}
        {filteredFaqs.length === 0 ? (
          <div className="bg-[#0e1628] border border-white/5 rounded-2xl p-10 text-center text-[#8493a8]">
            <svg className="w-12 h-12 mx-auto text-[#4f6380] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-[#d8e4f0] mb-1">No matching questions found</p>
            <p className="text-sm">Try tweaking your search term or select &quot;All Questions&quot;.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => {
              const isOpen = expandedFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-[#0e1628] border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-medium text-[#d8e4f0] hover:text-[#00cfa8] transition-colors">
                      {faq.question}
                    </span>
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#8493a8] transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#00cfa8]" : ""
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-6 sm:px-6 pt-1 text-sm text-[#8493a8] leading-relaxed border-t border-white/5">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Support Contact & Hours Banner */}
      <div className="bg-gradient-to-r from-[#0d162a] via-[#101c34] to-[#0d162a] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00cfa8]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#00cfa8]/10 text-[#00cfa8] text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-[#00cfa8] animate-pulse" />
              Direct Assistance Available
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Still have questions or need custom advisory?
            </h3>
            <p className="text-[#8493a8] text-sm sm:text-base max-w-xl">
              Our business transition team and dedicated support agents are available Monday to Friday from 9:00 AM to 6:00 PM (IST).
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#8493a8]">
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#00cfa8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                support@bizexchange.com
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#00cfa8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Average response time &lt; 12 hours
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
            <Link
              href="/support/tickets/create"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#00cfa8] hover:bg-[#00e6bc] text-[#080c15] text-sm font-bold transition-colors whitespace-nowrap shadow-lg shadow-[#00cfa8]/10"
            >
              Submit a Support Ticket
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link
              href="/support/my-tickets"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1a2538] hover:bg-[#22314a] text-[#d8e4f0] text-sm font-semibold transition-colors whitespace-nowrap border border-white/5"
            >
              Check Existing Tickets
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
