'use client'
import { Loader } from "@/components/ui/loader";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function HomePage() {
  const { user } = useUser()
  const router = useRouter()
  useEffect(() => {
      if (user?.isConfirmed){
        router.push('/history');
      }
  }, [router, user]);

  return (
      user?.isConfirmed ? 
      (
        <div className="flex flex-col h-[90vh] items-center justify-center gap-8">
          <Loader size={48} className="text-primary" />
        </div>
      ) :
      (
       <div className="flex flex-col h-[90vh] items-center justify-center gap-6 ">
        <div className="flex items-center gap-3 text-red-600 animate-pulse">
          <AlertTriangle className="w-8 h-8" />
          <span className="text-2xl font-semibold">Account not confirmed</span>
        </div>

      </div>
      )
      
  );
}