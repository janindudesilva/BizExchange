import { BusinessApiResponse } from "@/types/business";
import BusinessCard from "@/components/BusinessCard";

async function getBusinesses() {
  try {
    const response = await fetch("http://localhost:8080/api/businesses", {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Businesses fetch failed with status:", response.status);
      return [];
    }

    const result: BusinessApiResponse = await response.json();
    return result.data;
  } catch (err) {
    console.error("Businesses fetch error:", err);
    return [];
  }
}

export default async function BusinessesPage() {
  const businesses = await getBusinesses();

  return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#d8e4f0] tracking-wide">Available Businesses</h1>
          <p className="text-[#4f6380] mt-2 text-sm">
            Browse approved businesses available for sale.
          </p>
        </div>

        {businesses.length === 0 ? (
            <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl">
              <p className="text-[#8092ab]">No businesses available yet.</p>
            </div>
        ) : (
            <div className="grid md:grid-cols-3 gap-5">
              {businesses.map((business) => (
                  <BusinessCard key={business.id} business={business} />
              ))}
            </div>
        )}
      </main>
  );
}