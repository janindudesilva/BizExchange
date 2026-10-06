import ProtectedRoute from "@/components/ProtectedRoute";

export default function SupportAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["SUPPORT_AGENT", "ADMIN"]}>
      {children}
    </ProtectedRoute>
  );
}
