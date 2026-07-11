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
          <h1 className="text-3xl font-bold">Available Businesses</h1>
          <p className="text-slate-300 mt-2">
            Browse approved businesses available for sale.
          </p>
        </div>

        {businesses.length === 0 ? (
            <div className="bg-white p-6 rounded-xl text-black">
              <p>No businesses available yet.</p>
            </div>
        ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {businesses.map((business) => (
                  <BusinessCard key={business.id} business={business} />
              ))}
            </div>
        )}
      </main>
  );
}