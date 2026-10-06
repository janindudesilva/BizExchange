import ProtectedRoute from "@/components/ProtectedRoute";

export default function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["VERIFICATION_OFFICER", "ADMIN"]}>
      {children}
    </ProtectedRoute>
  );
}
