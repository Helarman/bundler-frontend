"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tokenMetadataSchema = z.object({
  name: z.string().min(1, "Required"),
  symbol: z.string().min(1, "Required").max(10, "Max 10 characters"),
  description: z.string().min(1, "Required"),
  image: z.any(),
  vanityAddress: z.object({
    enabled: z.boolean(),
    type: z.enum(["prefix", "suffix"]),
    value: z.string().max(4, "Max 4 characters").optional(),
  }),
});

export default function TokenMetadataForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const form = useForm<z.infer<typeof tokenMetadataSchema>>({
    resolver: zodResolver(tokenMetadataSchema),
    defaultValues: {
      name: "",
      symbol: "",
      description: "",
      vanityAddress: {
        enabled: false,
        type: "suffix",
        value: "pump",
      },
    },
  });

  const onSubmit = (data: z.infer<typeof tokenMetadataSchema>) => {
    console.log("Token metadata submitted:", data);
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
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
          control={form.control}
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

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Describe your token..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  onChange={(e) => field.onChange(e.target.files?.[0])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="vanityAddress.enabled"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Use Vanity Address</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("vanityAddress.enabled") && (
            <div className="ml-6 space-y-4">
              <FormField
                control={form.control}
                name="vanityAddress.type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="prefix">Prefix</SelectItem>
                        <SelectItem value="suffix">Suffix</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vanityAddress.value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value (max 4 chars)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          form.watch("vanityAddress.type") === "prefix"
                            ? "Prefix"
                            : "pump"
                        }
                        maxLength={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit">Next</Button>
        </div>
      </form>
    </Form>
  );
}