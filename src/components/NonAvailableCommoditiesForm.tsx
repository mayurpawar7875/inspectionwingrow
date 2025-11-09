import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, AlertCircle, Plus, X } from 'lucide-react';

const commoditySchema = z.object({
  commodities: z.array(
    z.object({
      commodity_name: z.string().trim().min(1, 'Commodity name is required').max(100),
      notes: z.string().trim().max(500).optional(),
    })
  ).min(1, 'At least one commodity is required'),
});

type CommodityFormData = z.infer<typeof commoditySchema>;

interface NonAvailableCommoditiesFormProps {
  sessionId: string;
  marketId: string;
  marketDate: string;
  userId: string;
  onSuccess?: () => void;
}

export default function NonAvailableCommoditiesForm({ 
  sessionId, 
  marketId, 
  marketDate, 
  userId, 
  onSuccess 
}: NonAvailableCommoditiesFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<CommodityFormData>({
    resolver: zodResolver(commoditySchema),
    defaultValues: {
      commodities: [{ commodity_name: '', notes: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'commodities',
  });

  const onSubmit = async (data: CommodityFormData) => {
    setIsSubmitting(true);
    
    try {
      const commodities = data.commodities.map(commodity => ({
        commodity_name: commodity.commodity_name,
        notes: commodity.notes || null,
        user_id: userId,
        session_id: sessionId,
        market_id: marketId,
        market_date: marketDate,
      }));

      const { error } = await supabase
        .from('non_available_commodities')
        .insert(commodities);

      if (error) throw error;

      toast.success('Non-available commodities submitted successfully!');
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting non-available commodities:', error);
      toast.error(error.message || 'Failed to submit commodities');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
          <CardTitle className="text-base sm:text-lg">Non-Available Commodities</CardTitle>
        </div>
        <CardDescription className="text-xs sm:text-sm">List commodities that are not available in this market today</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs sm:text-sm">Commodity {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name={`commodities.${index}.commodity_name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Commodity Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter commodity name" className="h-8 sm:h-10 text-xs sm:text-sm" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`commodities.${index}.notes`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any additional notes" 
                            className="text-xs sm:text-sm"
                            {...field} 
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => append({ commodity_name: '', notes: '' })}
              className="w-full h-8 sm:h-10 text-xs sm:text-sm"
            >
              <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Add Another Commodity
            </Button>

            <Button type="submit" disabled={isSubmitting} className="w-full h-8 sm:h-10 text-xs sm:text-sm">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Non-Available Commodities'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
