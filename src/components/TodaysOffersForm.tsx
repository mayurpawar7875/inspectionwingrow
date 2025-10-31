import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';

const offerSchema = z.object({
  antic: z.string().trim().min(1, 'Antic commodity is required').max(100),
  leafy_vegetable: z.string().trim().min(1, 'Leafy vegetable is required').max(100),
  vegetable_1: z.string().trim().min(1, 'Vegetable 1 is required').max(100),
  vegetable_2: z.string().trim().min(1, 'Vegetable 2 is required').max(100),
  exotic: z.string().trim().min(1, 'Exotic commodity is required').max(100),
  onion_potato: z.string().trim().min(1, 'Onion/Potato is required').max(100),
  fruit_1: z.string().trim().min(1, 'Fruit 1 is required').max(100),
  fruit_2: z.string().trim().min(1, 'Fruit 2 is required').max(100),
  seasonal_1: z.string().trim().min(1, 'Seasonal 1 is required').max(100),
  seasonal_2: z.string().trim().min(1, 'Seasonal 2 is required').max(100),
});

type OfferFormData = z.infer<typeof offerSchema>;

interface TodaysOffersFormProps {
  sessionId: string;
  marketId: string;
  marketDate: string;
  userId: string;
  onSuccess?: () => void;
}

export default function TodaysOffersForm({ sessionId, marketId, marketDate, userId, onSuccess }: TodaysOffersFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      antic: '',
      leafy_vegetable: '',
      vegetable_1: '',
      vegetable_2: '',
      exotic: '',
      onion_potato: '',
      fruit_1: '',
      fruit_2: '',
      seasonal_1: '',
      seasonal_2: '',
    },
  });

  const onSubmit = async (data: OfferFormData) => {
    setIsSubmitting(true);
    
    try {
      // Prepare offers data
      const offers = [
        { commodity_name: data.antic, category: 'antic' },
        { commodity_name: data.leafy_vegetable, category: 'leafy_vegetable' },
        { commodity_name: data.vegetable_1, category: 'vegetable' },
        { commodity_name: data.vegetable_2, category: 'vegetable' },
        { commodity_name: data.exotic, category: 'exotic' },
        { commodity_name: data.onion_potato, category: 'onion_potato' },
        { commodity_name: data.fruit_1, category: 'fruit' },
        { commodity_name: data.fruit_2, category: 'fruit' },
        { commodity_name: data.seasonal_1, category: 'seasonal' },
        { commodity_name: data.seasonal_2, category: 'seasonal' },
      ].map(offer => ({
        ...offer,
        user_id: userId,
        session_id: sessionId,
        market_id: marketId,
        market_date: marketDate,
      }));

      const { error } = await supabase
        .from('offers')
        .insert(offers);

      if (error) throw error;

      toast.success('Today\'s offers submitted successfully!');
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting offers:', error);
      toast.error(error.message || 'Failed to submit offers');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <CardTitle>Today's Offers</CardTitle>
        </div>
        <CardDescription>Enter the commodity offers for today's market</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Antic */}
            <FormField
              control={form.control}
              name="antic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Antic Commodity</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter antic commodity name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Leafy Vegetable */}
            <FormField
              control={form.control}
              name="leafy_vegetable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leafy Vegetable</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter leafy vegetable name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vegetables */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Vegetables (2 required)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vegetable_1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vegetable 1</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter vegetable name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vegetable_2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vegetable 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter vegetable name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Exotic */}
            <FormField
              control={form.control}
              name="exotic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exotic Commodity</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter exotic commodity name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Onion/Potato */}
            <FormField
              control={form.control}
              name="onion_potato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Onion/Potato</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter onion or potato variety" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fruits */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Fruits (2 required)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fruit_1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fruit 1</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter fruit name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fruit_2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fruit 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter fruit name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Seasonal */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Seasonal Commodities (2 required)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="seasonal_1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seasonal 1</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter seasonal commodity" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seasonal_2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seasonal 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter seasonal commodity" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Today\'s Offers'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
