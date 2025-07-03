import { Navbar } from "@/components/features/navbar/Navbar";
import { ProtectedRoute } from "@/components/features/routing/ProtectedRoute";
import { Toaster } from "sonner";


export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <Navbar/>
      <Toaster position="bottom-right" />
        {children}
    </ProtectedRoute>
  )
}