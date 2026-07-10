import { SingleBusinessApiResponse } from "@/types/business";

async function getBusiness(id: string) {
  const response = await fetch(`http://localhost:8080/api/businesses/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch business");
  }

  const result: SingleBusinessApiResponse = await response.json();
  return result.data;
}

export default async function BusinessDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await getBusiness(id);

  return (
    <main className="max-w-4xl mx-auto bg-white mt-10 p-8 rounded-xl shadow-sm">
      <p className="text-sm text-blue-600 font-medium mb-2">
        {business.category}
      </p>

      <h1 className="text-4xl font-bold mb-4">{business.title}</h1>

      <p className="text-slate-500 mb-6">
        {business.location} • Seller: {business.sellerName}
      </p>

      <p className="text-2xl font-bold text-green-700 mb-6">
        LKR {business.askingPrice.toLocaleString()}
      </p>

      <p className="text-slate-700 leading-7 mb-8">{business.description}</p>

      <button className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">
        Send Inquiry
      </button>
    </main>
  );
}
