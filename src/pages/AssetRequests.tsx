import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetRequestForm } from '@/components/AssetRequestForm';
import { AssetRequestsList } from '@/components/AssetRequestsList';

export default function AssetRequests() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Asset Management</h1>
        <p className="text-muted-foreground">Request assets and manage your asset requests</p>
      </div>

      <Tabs defaultValue="request" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="request">New Request</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="mt-6">
          <AssetRequestForm />
        </TabsContent>

        <TabsContent value="my-requests" className="mt-6">
          <AssetRequestsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}