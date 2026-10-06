import ProtectedRoute from "@/components/ProtectedRoute";

export default function AgentLayout({
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
