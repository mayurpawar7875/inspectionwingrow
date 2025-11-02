import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin } from 'lucide-react';

const CITIES = ['Pune', 'Mumbai'];

export default function EmployeeCitySelection() {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState<string>('');

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    navigate(`/admin/employee-reporting/city/${encodeURIComponent(city)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h2 className="text-3xl font-bold">Employee Reporting - Select City</h2>
          <p className="text-muted-foreground">Choose a city to view employee activities</p>
        </div>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <MapPin className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Select City</h3>
              <p className="text-sm text-muted-foreground">Choose a city to continue</p>
            </div>
          </div>

          <Select value={selectedCity} onValueChange={handleCitySelect}>
            <SelectTrigger className="w-full h-12 text-base bg-background">
              <SelectValue placeholder="Select a city" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {CITIES.map((city) => (
                <SelectItem 
                  key={city} 
                  value={city}
                  className="cursor-pointer hover:bg-accent focus:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <span>{city}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
