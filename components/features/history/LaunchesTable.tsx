'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Copy, MoreHorizontal } from "lucide-react"
import { toast } from 'sonner'
import { LaunchDetailsDialog, LaunchDetails, Transaction } from './LaunchDetailsDialog'

interface Launch {
  id: number
  name: string
  pnl: number
  date: string
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS'
  tokenAddress: string
}

export function LaunchesTable() {
  const [selectedLaunch, setSelectedLaunch] = useState<LaunchDetails | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const generateDemoTransactions = (launchId: number): Transaction[] => [
    {
      txHash: `${launchId}x120k9d8s7e6r5t4y3u2i1o0p9l8k7j6h5g4f3d2s1a`,
      type: 'BUY',
      amount: Math.random() * 5 + 0.1,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      wallet: `HjK8LpO9i8U7Y6T5R4E3W2Q1A0S9D8F7G6H5J4K3L2Z1X`
    },
    {
      txHash: `${launchId}y230l0a9s8d7f6g5h4j3k2l1z0x9c8v7b6n5m4`,
      type: 'SELL',
      amount: Math.random() * 3 + 0.05,
      timestamp: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
      wallet: `QwErTyUiOpAsDfGhJkLzXcVbNm`
    },
    {
      txHash: `${launchId}z340m1b0t9c8x7z6y5u4i3o2p1l9k8j7h6g5f4d3s2a1`,
      type: 'TRANSFER',
      amount: Math.random() * 2 + 0.01,
      timestamp: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
      wallet: `MnBvCxZaLkJuHbVgTfCrDxSzQwEr`
    }
  ]

  const launches: Launch[] = [
    {
      id: 1,
      name: 'Solana Monkey',
      pnl: 12.45,
      date: '2023-05-15T10:30:00Z',
      status: 'COMPLETED',
      tokenAddress: 'MSol1a1b1c1d1e1f1g1h1i1j1k1l1m1n1o1p1q1r1s1t1u1v1w1x1y1z'
    },
    {
      id: 2,
      name: 'Degenerate Ape',
      pnl: -3.21,
      date: '2023-06-20T14:45:00Z',
      status: 'FAILED',
      tokenAddress: 'DApe2a2b2c2d2e2f2g2h2i2j2k2l2m2n2o2p2q2r2s2t2u2v2w2x2y2z'
    },
    {
      id: 3,
      name: 'Famous Fox',
      pnl: 8.76,
      date: '2023-07-10T09:15:00Z',
      status: 'COMPLETED',
      tokenAddress: 'FFox3a3b3c3d3e3f3g3h3i3j3k3l3m3n3o3p3q3r3s3t3u3v3w3x3y3z'
    },
    {
      id: 4,
      name: 'Crypto Punk',
      pnl: 0.0,
      date: '2023-08-05T16:20:00Z',
      status: 'IN_PROGRESS',
      tokenAddress: 'CPunk4a4b4c4d4e4f4g4h4i4j4k4l4m4n4o4p4q4r4s4t4u4v4w4x4y4z'
    }
  ]

  const viewDetails = (launch: Launch) => {
    setSelectedLaunch({
      id: launch.id.toString(),
      tokenName: launch.name,
      tokenSymbol: launch.name.slice(0, 4).toUpperCase(),
      createdAt: launch.date,
      totalRaised: (launch.pnl + 10) * (Math.random() * 2 + 0.5),
      pnl: launch.pnl,
      status: launch.status,
      tokenAddress: launch.tokenAddress,
      transactions: generateDemoTransactions(launch.id),
      metadata: {
        description: `Official token for ${launch.name}`,
        website: `https://${launch.name.toLowerCase().replace(/\s+/g, '')}.com`,
        twitter: launch.name.toLowerCase().replace(/\s+/g, '')
      }
    })
    setIsDialogOpen(true)
  }

  return (
    <>
      <div className="rounded-lg border shadow-sm overflow-hidden">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-gray-50 dark:bg-gray-800">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead className="min-w-[150px]">Name</TableHead>
              <TableHead>PnL</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {launches.map((launch) => (
              <TableRow key={launch.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <TableCell className="font-medium">#{launch.id}</TableCell>
                <TableCell className="font-semibold">{launch.name}</TableCell>
                <TableCell>
                  <span className={`font-medium ${launch.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {launch.pnl >= 0 ? '+' : ''}{launch.pnl.toFixed(2)} SOL
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-gray-500 dark:text-gray-400">
                    {new Date(launch.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => viewDetails(launch)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => copyToClipboard(launch.tokenAddress)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedLaunch && (
        <LaunchDetailsDialog
          launch={selectedLaunch}
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </>
  )
}