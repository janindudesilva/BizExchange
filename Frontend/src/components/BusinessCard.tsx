import Link from "next/link";
import { Business } from "@/types/business";

interface Props {
  business: Business;
}

export default function BusinessCard({ business }: Props) {
  return (
    <div className="bg-[#121c32] border border-white/5 p-6 rounded-2xl transition-colors hover:border-white/10">
      <h2 className="text-xl font-semibold mb-2 text-[#d8e4f0]">{business.title}</h2>

      <p className="text-sm text-[#4f6380] mb-2">
        {business.category} • {business.location}
      </p>

      <p className="text-[#8092ab] text-sm mb-4 line-clamp-3">
        {business.description}
      </p>

      <p className="text-[#00cfa8] font-bold mb-4">
        LKR {business.askingPrice.toLocaleString()}
      </p>

      <p className="text-sm text-[#4f6380] mb-4">
        Seller: {business.sellerName}
      </p>

      <Link
        href={`/businesses/${business.id}`}
        className="inline-block bg-[#00cfa8] text-[#080c15] px-4 py-2 rounded-lg font-semibold hover:bg-[#00e6bc] transition-colors text-sm"
      >
        View Details
      </Link>
    </div>
  );
}
