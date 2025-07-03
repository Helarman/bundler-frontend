'use client'

import { LaunchesTable } from '@/components/features/history/LaunchesTable'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/hooks/useUser'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function HistoryPage() {
  const router = useRouter()
  const { user } = useUser()
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Launch History</h1>
        <Button onClick={() => router.push('/new-launch/metadata')} disabled={!user?.isSettingConfirmed}>
          <Plus className="mr-2 h-4 w-4" />
          New Launch
        </Button>
      </div>
      <LaunchesTable/>
    </div>
  )
}