import ProtectedRoute from "@/components/ProtectedRoute";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["SELLER", "ADMIN"]}>
      {children}
    </ProtectedRoute>
  );
}
