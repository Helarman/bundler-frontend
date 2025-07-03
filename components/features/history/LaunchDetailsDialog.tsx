'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog-wide'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Copy, ExternalLink, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

export interface Transaction {
  txHash: string
  type: 'BUY' | 'SELL' | 'TRANSFER'
  amount: number
  timestamp: string
  wallet: string
}

export interface LaunchDetails {
  id: string
  tokenName: string
  tokenSymbol: string
  createdAt: string
  totalRaised: number
  pnl: number
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS'
  transactions: Transaction[]
  tokenAddress: string
  metadata?: {
    description?: string
    website?: string
    twitter?: string
  }
}

interface LaunchDetailsDialogProps {
  launch: LaunchDetails
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function LaunchDetailsDialog({ launch, isOpen, onOpenChange }: LaunchDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const viewOnExplorer = (address: string, type: 'tx' | 'address' = 'tx') => {
    window.open(`https://explorer.solana.com/${type}/${address}`, '_blank')
  }

  const getStatusBadge = () => {
    switch (launch.status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Failed</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">In Progress</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  const refreshData = async () => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Data refreshed')
    } catch (error) {
      toast.error('Failed to refresh data')
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[1200px] max-w-[80vw] h-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <span>
                {launch.tokenName} ({launch.tokenSymbol})
              </span>
              {getStatusBadge()}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Token Address</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono truncate">{launch.tokenAddress}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(launch.tokenAddress)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => viewOnExplorer(launch.tokenAddress, 'address')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Total Raised</h3>
              <p className="text-sm font-medium">{launch.totalRaised.toFixed(2)} SOL</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">PnL</h3>
              <p className={`text-sm font-medium ${launch.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {launch.pnl >= 0 ? '+' : ''}{launch.pnl.toFixed(2)} SOL
              </p>
            </div>
          </div>

          {launch.metadata && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setShowMetadata(!showMetadata)}
              >
                {showMetadata ? (
                  <ChevronUp className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                Token Metadata
              </Button>
              
              {showMetadata && (
                <div className="p-4 border rounded-lg bg-muted/50">
                    <p>
                      Lorem ipsum dolor sit amet consectetur adipisicing elit. Laudantium dicta natus similique. Vitae, nesciunt. Veritatis aut iste optio sequi atque maiores sapiente esse, deserunt unde, temporibus cupiditate suscipit illum delectus?
                    </p>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Transaction History</h3>
              <span className="text-sm text-muted-foreground">
                {launch.transactions.length} transactions
              </span>
            </div>

            {launch.transactions.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {launch.transactions.map((tx) => (
                      <TableRow key={tx.txHash}>
                        <TableCell>
                          <Badge 
                            variant={
                              tx.type === 'BUY' ? 'default' : 
                              tx.type === 'SELL' ? 'destructive' : 'outline'
                            }
                            className="capitalize"
                          >
                            {tx.type.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {tx.amount.toFixed(2)} SOL
                        </TableCell>
                        <TableCell className="font-mono text-sm truncate max-w-[120px]">
                          {tx.wallet}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(tx.timestamp)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyToClipboard(tx.txHash)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => viewOnExplorer(tx.txHash)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/50">
                <RefreshCw className="mx-auto h-8 w-8 mb-3 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full items-center">
            <span className="text-sm text-muted-foreground">
              Launched at {formatDate(launch.createdAt)}
            </span>
            <Button 
              variant="outline" 
              onClick={() => viewOnExplorer(launch.tokenAddress, 'address')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Explorer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}