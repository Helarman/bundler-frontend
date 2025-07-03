import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function RpcSettingsForm() {
  return (
    <div className="space-y-4 max-w-md">
      <div>
        <Label htmlFor="rpc">RPC URL</Label>
        <Input id="rpc" placeholder="https://..." />
      </div>
      <div>
        <Label htmlFor="wss">WSS RPC URL</Label>
        <Input id="wss" placeholder="wss://..." />
      </div>
      <div>
        <Label htmlFor="wallet">Dev Wallet Private Key</Label>
        <Input id="wallet" placeholder="Enter private key" />
      </div>
      <Button>Save Settings</Button>
    </div>
  )
}