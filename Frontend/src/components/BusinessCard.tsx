import Link from "next/link";
import { Business } from "@/types/business";

interface Props {
  business: Business;
}

export default function BusinessCard({ business }: Props) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h2 className="text-xl font-semibold mb-2">{business.title}</h2>

      <p className="text-sm text-slate-500 mb-2">
        {business.category} • {business.location}
      </p>

      <p className="text-slate-700 mb-4 line-clamp-3">
        {business.description}
      </p>

      <p className="text-green-700 font-bold mb-4">
        LKR {business.askingPrice.toLocaleString()}
      </p>

      <p className="text-sm text-slate-500 mb-4">
        Seller: {business.sellerName}
      </p>

      <Link
        href={`/businesses/${business.id}`}
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        View Details
      </Link>
    </div>
  );
}
