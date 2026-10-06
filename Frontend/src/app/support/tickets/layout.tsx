import ProtectedRoute from "@/components/ProtectedRoute";

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
