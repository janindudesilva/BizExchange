import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="bg-white py-24 px-6 text-center">
        <h1 className="text-5xl font-bold text-slate-950 mb-6">
          Buy and Sell Small Businesses Securely
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          A trusted marketplace where small business owners can list their
          businesses for sale and buyers can discover verified opportunities.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            href="/businesses"
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
          >
            Browse Businesses
          </Link>

          <Link
            href="/register"
            className="border border-slate-300 px-6 py-3 rounded-md hover:bg-slate-100"
          >
            Create Account
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 px-6 py-16">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-3">For Sellers</h2>
          <p className="text-slate-600">
            List your business, upload financial details, and connect with
            interested buyers.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-3">For Buyers</h2>
          <p className="text-slate-600">
            Search businesses by category, location, and price range.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Verified Platform</h2>
          <p className="text-slate-600">
            Admin approval, seller verification, and secure inquiry workflow.
          </p>
        </div>
      </section>
    </main>
  );
}
