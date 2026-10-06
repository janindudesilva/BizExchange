import ProtectedRoute from "@/components/ProtectedRoute";

export default function FavoritesLayout({
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
