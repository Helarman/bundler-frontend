'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { SolanaTokenClient } from '@/lib/api/solana-token'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUpload } from '@/components/ui/file-upload'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Form schemas
const createTokenSchema = z.object({
  owner: z.string().min(1, 'Owner address is required'),
  name: z.string().min(1, 'Name is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  description: z.string().optional(),
  website: z.string().url('Invalid URL').optional(),
  twitter: z.string().optional(),
  telegram: z.string().optional(),
  discord: z.string().optional(),
  buyers: z.string().min(1, 'At least one buyer is required'),
})

const buyAllSchema = z.object({
  percent: z.number().min(1).max(100),
  keepSolanaAmount: z.number().min(0).optional(),
  slippagePercent: z.number().min(0.1).max(50).optional(),
  priorityMicroLamptorsFee: z.number().min(0).optional(),
})

const transferAllSchema = z.object({
  address: z.string().min(1, 'Token address is required'),
  priorityMicroLamptorsFee: z.number().min(0).optional(),
})

const sellAllSchema = z.object({
  percent: z.number().min(1).max(100),
  keepAmount: z.number().min(0).optional(),
  slippagePercent: z.number().min(0.1).max(50).optional(),
  priorityMicroLamptorsFee: z.number().min(0).optional(),
})

type CreateTokenFormValues = z.infer<typeof createTokenSchema>
type BuyAllFormValues = z.infer<typeof buyAllSchema>
type TransferAllFormValues = z.infer<typeof transferAllSchema>
type SellAllFormValues = z.infer<typeof sellAllSchema>

export default function SolanaTokenPage() {
  const [activeTab, setActiveTab] = useState('create')
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [txHashes, setTxHashes] = useState<string[]>([])
  const [tokenData, setTokenData] = useState<any>(null)

  // Fetch token data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await SolanaTokenClient.getData()
        setTokenData(data)
      } catch (error) {
        toast.error('Failed to fetch token data')
      }
    }
    fetchData()
  }, [])

  // Create Token Form
  const createTokenForm = useForm<CreateTokenFormValues>({
    resolver: zodResolver(createTokenSchema),
    defaultValues: {
      owner: '',
      name: '',
      symbol: '',
      description: '',
      website: '',
      twitter: '',
      telegram: '',
      discord: '',
      buyers: '',
    },
  })

  // Buy All Form
  const buyAllForm = useForm<BuyAllFormValues>({
    resolver: zodResolver(buyAllSchema),
    defaultValues: {
      percent: 100,
      keepSolanaAmount: 0,
      slippagePercent: 5,
      priorityMicroLamptorsFee: 0,
    },
  })

  // Transfer All Form
  const transferAllForm = useForm<TransferAllFormValues>({
    resolver: zodResolver(transferAllSchema),
    defaultValues: {
      address: '',
      priorityMicroLamptorsFee: 0,
    },
  })

  // Sell All Form
  const sellAllForm = useForm<SellAllFormValues>({
    resolver: zodResolver(sellAllSchema),
    defaultValues: {
      percent: 100,
      keepAmount: 0,
      slippagePercent: 5,
      priorityMicroLamptorsFee: 0,
    },
  })

  // Handle create token
  const onCreateToken = async (values: CreateTokenFormValues) => {
    if (!file) {
      toast.error('Please upload a token image')
      return
    }

    setIsLoading(true)
    try {
      const buyers = SolanaTokenClient.parseBuyersString(values.buyers)
      
      const promise = SolanaTokenClient.createToken(
        {
          ...values,
          buyers,
        },
        file
      )

      toast.promise(promise, {
        loading: 'Creating token...',
        success: (response) => {
          setTxHashes(response.txHashes)
          return 'Token created successfully!'
        },
        error: (error) => {
          return error.message || 'Failed to create token'
        },
      })
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle buy all
  const onBuyAll = async (values: BuyAllFormValues) => {
    setIsLoading(true)
    try {
      const promise = SolanaTokenClient.buyAll(values)

      toast.promise(promise, {
        loading: 'Purchasing tokens...',
        success: (response) => {
          setTxHashes(response.txHashes)
          return `Successfully purchased ${values.percent}% of tokens!`
        },
        error: (error) => {
          return error.message || 'Failed to buy tokens'
        },
      })
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle transfer all
  const onTransferAll = async (values: TransferAllFormValues) => {
    setIsLoading(true)
    try {
      const promise = SolanaTokenClient.transferAll(values)

      toast.promise(promise, {
        loading: 'Transferring tokens...',
        success: (response) => {
          setTxHashes(response.txHashes)
          return 'Tokens transferred successfully!'
        },
        error: (error) => {
          return error.message || 'Failed to transfer tokens'
        },
      })
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle sell all
  const onSellAll = async (values: SellAllFormValues) => {
    setIsLoading(true)
    try {
      const promise = SolanaTokenClient.sellAll(values)

      toast.promise(promise, {
        loading: 'Selling tokens...',
        success: (response) => {
          setTxHashes(response.txHashes)
          return `Successfully sold ${values.percent}% of tokens!`
        },
        error: (error) => {
          return error.message || 'Failed to sell tokens'
        },
      })
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Solana Token Service</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">Create Token</TabsTrigger>
          <TabsTrigger value="buy">Buy Tokens</TabsTrigger>
          <TabsTrigger value="transfer">Transfer Tokens</TabsTrigger>
          <TabsTrigger value="sell">Sell Tokens</TabsTrigger>
        </TabsList>

        {/* Create Token Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Token</CardTitle>
              <CardDescription>
                Create a new SPL token on Solana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...createTokenForm}>
                <form onSubmit={createTokenForm.handleSubmit(onCreateToken)} className="space-y-4">
                  <FormField
                    control={createTokenForm.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter owner wallet address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createTokenForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Awesome Token" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createTokenForm.control}
                      name="symbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token Symbol</FormLabel>
                          <FormControl>
                            <Input placeholder="MAT" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createTokenForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your token..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                      control={createTokenForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://my-token.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createTokenForm.control}
                      name="twitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Twitter</FormLabel>
                          <FormControl>
                            <Input placeholder="@mytoken" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createTokenForm.control}
                      name="telegram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telegram</FormLabel>
                          <FormControl>
                            <Input placeholder="t.me/mytoken" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createTokenForm.control}
                      name="discord"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discord</FormLabel>
                          <FormControl>
                            <Input placeholder="discord.gg/mytoken" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createTokenForm.control}
                    name="buyers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buyers (address:amount)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="E.g. address1:1.5, address2:0.5"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Token Image</FormLabel>
                    <FileUpload
                      accept="image/*"
                      onDrop={(acceptedFiles) => setFile(acceptedFiles[0])}
                    />
                    {file && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Token'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Buy Tokens Tab */}
        <TabsContent value="buy">
          <Card>
            <CardHeader>
              <CardTitle>Buy Tokens</CardTitle>
              <CardDescription>
                Purchase tokens from an existing pool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...buyAllForm}>
                <form onSubmit={buyAllForm.handleSubmit(onBuyAll)} className="space-y-4">
                  <FormField
                    control={buyAllForm.control}
                    name="percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentage to Buy</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={buyAllForm.control}
                    name="keepSolanaAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Keep SOL Amount (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={buyAllForm.control}
                    name="slippagePercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slippage Percentage (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.1"
                            max="50"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={buyAllForm.control}
                    name="priorityMicroLamptorsFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Fee (micro-lamports, optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Buying...' : 'Buy Tokens'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfer Tokens Tab */}
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Tokens</CardTitle>
              <CardDescription>
                Transfer all tokens to another wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferAllForm}>
                <form onSubmit={transferAllForm.handleSubmit(onTransferAll)} className="space-y-4">
                  <FormField
                    control={transferAllForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter token address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transferAllForm.control}
                    name="priorityMicroLamptorsFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Fee (micro-lamports, optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Transferring...' : 'Transfer Tokens'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sell Tokens Tab */}
        <TabsContent value="sell">
          <Card>
            <CardHeader>
              <CardTitle>Sell Tokens</CardTitle>
              <CardDescription>
                Sell tokens back to the pool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...sellAllForm}>
                <form onSubmit={sellAllForm.handleSubmit(onSellAll)} className="space-y-4">
                  <FormField
                    control={sellAllForm.control}
                    name="percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentage to Sell</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={sellAllForm.control}
                    name="keepAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Keep Token Amount (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={sellAllForm.control}
                    name="slippagePercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slippage Percentage (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.1"
                            max="50"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={sellAllForm.control}
                    name="priorityMicroLamptorsFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Fee (micro-lamports, optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Selling...' : 'Sell Tokens'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transactions Section */}
      {txHashes.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Transaction Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txHashes.map((hash, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <a
                        href={`https://solscan.io/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {hash}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Token Data Section */}
      {tokenData && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Token Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Virtual SOL Reserves</p>
                <p className="font-medium">{tokenData.virtual_sol_reserves}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Virtual Token Reserves</p>
                <p className="font-medium">{tokenData.virtual_token_reserves}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Token Price</p>
                <p className="font-medium">{tokenData.token_price}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Market Cap</p>
                <p className="font-medium">{tokenData.market_cap}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Supply</p>
                <p className="font-medium">{tokenData.total_supply}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Circulating Supply</p>
                <p className="font-medium">{tokenData.circulating_supply}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Holders</p>
                <p className="font-medium">{tokenData.holders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}