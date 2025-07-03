import { ConfirmedRoute } from "@/components/features/routing/ConfirmedRoute";
import { Toaster } from "sonner";


export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfirmedRoute>
      <Toaster position="bottom-right" />
        <div className="container mx-auto mt-10">
          {children}
        </div>
    </ConfirmedRoute>
  )
}