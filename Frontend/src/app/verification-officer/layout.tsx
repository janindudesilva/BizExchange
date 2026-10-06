import ProtectedRoute from "@/components/ProtectedRoute";

export default function VerificationOfficerLayout({
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
