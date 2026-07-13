import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="py-24 px-6 text-center">
        <h1 className="text-5xl font-bold text-[#d8e4f0] mb-6 tracking-wide">
          Buy and Sell Small Businesses Securely
        </h1>

        <p className="text-lg text-[#8092ab] max-w-2xl mx-auto mb-8">
          A trusted marketplace where small business owners can list their
          businesses for sale and buyers can discover verified opportunities.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            href="/businesses"
            className="bg-[#00cfa8] text-[#080c15] px-6 py-3 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors"
          >
            Browse Businesses
          </Link>

          <Link
            href="/register"
            className="border border-white/10 text-[#c7d2e0] px-6 py-3 rounded-lg hover:bg-white/[0.04] hover:border-white/20 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5 px-6 py-16">
        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-3 text-[#d8e4f0]">For Sellers</h2>
          <p className="text-[#8092ab] text-sm">
            List your business, upload financial details, and connect with
            interested buyers.
          </p>
        </div>

        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-3 text-[#d8e4f0]">For Buyers</h2>
          <p className="text-[#8092ab] text-sm">
            Search businesses by category, location, and price range.
          </p>
        </div>

        <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-3 text-[#d8e4f0]">Verified Platform</h2>
          <p className="text-[#8092ab] text-sm">
            Admin approval, seller verification, and secure inquiry workflow.
          </p>
        </div>
      </section>
    </main>
  );
}
