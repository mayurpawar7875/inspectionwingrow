import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { GeneralTab } from '@/components/admin/settings/GeneralTab';
import { MarketsTab } from '@/components/admin/settings/MarketsTab';
import { TimeWindowsTab } from '@/components/admin/settings/TimeWindowsTab';
import { AttendanceTab } from '@/components/admin/settings/AttendanceTab';
import { NotificationsTab } from '@/components/admin/settings/NotificationsTab';
import { FarmersTab } from '@/components/admin/settings/FarmersTab';
import { RolesTab } from '@/components/admin/settings/RolesTab';
import { DataTab } from '@/components/admin/settings/DataTab';
import { SecurityTab } from '@/components/admin/settings/SecurityTab';
import { PWATab } from '@/components/admin/settings/PWATab';
import { AuditTab } from '@/components/admin/settings/AuditTab';

function SettingsContent() {
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleDiscard = () => {
    window.location.reload();
  };

  const handleSave = async () => {
    // Save handled by individual tabs through context
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your application configuration</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-11">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="farmers">Farmers</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="pwa">PWA</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="markets">
          <MarketsTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="farmers">
          <FarmersTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="time">
          <TimeWindowsTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="data">
          <DataTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="pwa">
          <PWATab onChangeMade={() => setHasChanges(true)} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTab />
        </TabsContent>
      </Tabs>

      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 flex justify-end gap-3 shadow-lg z-50">
          <Button variant="outline" onClick={handleDiscard}>
            Discard Changes
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  return (
    <AdminLayout>
      <SettingsProvider>
        <SettingsContent />
      </SettingsProvider>
    </AdminLayout>
  );
}
