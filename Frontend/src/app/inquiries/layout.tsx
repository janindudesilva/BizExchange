import ProtectedRoute from "@/components/ProtectedRoute";

export default function InquiriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
