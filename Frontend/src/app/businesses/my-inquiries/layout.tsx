import ProtectedRoute from "@/components/ProtectedRoute";

export default function MyInquiriesLayout({
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
