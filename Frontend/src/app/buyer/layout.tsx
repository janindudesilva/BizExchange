import ProtectedRoute from "@/components/ProtectedRoute";

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["BUYER", "ADMIN"]}>
      {children}
    </ProtectedRoute>
  );
}
