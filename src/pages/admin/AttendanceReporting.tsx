// import { useState, useEffect } from "react";
// import { supabase } from "@/integrations/supabase/client";
// import { AdminLayout } from "@/components/AdminLayout";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Badge } from "@/components/ui/badge";
// import {
//   Drawer,
//   DrawerContent,
//   DrawerHeader,
//   DrawerTitle,
//   DrawerDescription,
//   DrawerClose,
// } from "@/components/ui/drawer";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
// import { Download, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react";
// import { format, startOfYear, endOfYear, eachMonthOfInterval, getDaysInMonth, startOfMonth, getDay } from "date-fns";
// import { toast } from "sonner";
// import { cn } from "@/lib/utils";
// import { CheckCircle2, AlertCircle, XCircle, MinusCircle } from "lucide-react";

// interface AttendanceRecord {
//   id: string;
//   user_id: string;
//   attendance_date: string;
//   role: string;
//   market_id: string;
//   city: string;
//   total_tasks: number;
//   completed_tasks: number;
//   status: "full_day" | "half_day" | "absent" | "weekly_off";
//   employee_name?: string;
//   market_name?: string;
// }

// interface DayData {
//   date: string;
//   records: AttendanceRecord[];
//   summary: {
//     full_day: number;
//     half_day: number;
//     absent: number;
//     weekly_off: number;
//   };
// }

// const STATUS_CONFIG = {
//   full_day: { label: "Full Day", color: "bg-green-500", icon: CheckCircle2 },
//   half_day: { label: "Half Day", color: "bg-orange-500", icon: AlertCircle },
//   absent: { label: "Absent", color: "bg-red-500", icon: XCircle },
//   weekly_off: { label: "Weekly Off", color: "bg-blue-500", icon: MinusCircle },
//   no_data: { label: "No Data", color: "bg-muted", icon: MinusCircle },
// };

// export default function AttendanceReporting() {
//   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
//   const [records, setRecords] = useState<AttendanceRecord[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [markets, setMarkets] = useState<any[]>([]);
//   const [cities, setCities] = useState<string[]>([]);

//   // Filters
//   const [selectedRole, setSelectedRole] = useState<string>("all");
//   const [selectedCity, setSelectedCity] = useState<string>("all");
//   const [selectedMarket, setSelectedMarket] = useState<string>("all");
//   const [userSearch, setUserSearch] = useState<string>("");

//   // Drawer state
//   const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
//   const [drawerOpen, setDrawerOpen] = useState(false);

//   // Data aggregation
//   const [dayMap, setDayMap] = useState<Map<string, DayData>>(new Map());
//   const [yearSummary, setYearSummary] = useState({
//     full_day: 0,
//     half_day: 0,
//     absent: 0,
//     weekly_off: 0,
//   });

//   useEffect(() => {
//     fetchMarkets();
//   }, []);

//   useEffect(() => {
//     fetchRecords();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedYear, selectedRole, selectedCity, selectedMarket, userSearch, markets]);

//   const fetchMarkets = async () => {
//     const { data } = await supabase.from("markets").select("id, name, city").eq("is_active", true).order("name");

//     if (data) {
//       setMarkets(data);
//       const uniqueCities = [...new Set(data.map((m) => m.city).filter(Boolean))];
//       setCities(uniqueCities as string[]);
//     }
//   };

//   const fetchRecords = async () => {
//     setLoading(true);

//     const startDate = format(startOfYear(new Date(selectedYear, 0)), "yyyy-MM-dd");
//     const endDate = format(endOfYear(new Date(selectedYear, 0)), "yyyy-MM-dd");

//     let query = supabase
//       .from("attendance_records")
//       .select("*")
//       .gte("attendance_date", startDate)
//       .lte("attendance_date", endDate);

//     if (selectedRole !== "all") query = query.eq("role", selectedRole as any);
//     if (selectedCity !== "all") query = query.eq("city", selectedCity);
//     if (selectedMarket !== "all") query = query.eq("market_id", selectedMarket);

//     const { data, error } = await query;

//     if (error) {
//       toast.error("Failed to fetch attendance records");
//       setLoading(false);
//       return;
//     }

//     const enrichedRecords = await Promise.all(
//       (data || []).map(async (record) => {
//         const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", record.user_id).single();

//         const market = markets.find((m) => m.id === record.market_id);

//         return {
//           ...record,
//           employee_name: profile?.full_name || "Unknown",
//           market_name: market?.name || "Unknown",
//         };
//       }),
//     );

//     let filteredRecords = enrichedRecords;
//     if (userSearch) {
//       filteredRecords = enrichedRecords.filter((r) =>
//         r.employee_name?.toLowerCase().includes(userSearch.toLowerCase()),
//       );
//     }

//     setRecords(filteredRecords);

//     const newDayMap = new Map<string, DayData>();
//     filteredRecords.forEach((record) => {
//       const dateStr = record.attendance_date;
//       if (!newDayMap.has(dateStr)) {
//         newDayMap.set(dateStr, {
//           date: dateStr,
//           records: [],
//           summary: { full_day: 0, half_day: 0, absent: 0, weekly_off: 0 },
//         });
//       }

//       const dayData = newDayMap.get(dateStr)!;
//       dayData.records.push(record);
//       dayData.summary[record.status]++;
//     });

//     setDayMap(newDayMap);

//     const summary = { full_day: 0, half_day: 0, absent: 0, weekly_off: 0 };
//     filteredRecords.forEach((record) => {
//       summary[record.status]++;
//     });
//     setYearSummary(summary);
//     setLoading(false);
//   };

//   const handleDayClick = (dayData: DayData) => {
//     setSelectedDay(dayData);
//     setDrawerOpen(true);
//   };

//   const exportToCSV = () => {
//     const headers = ["Date", "User", "Role", "Market", "City", "Tasks Done", "Total Tasks", "Status"];
//     const rows = records.map((r) => [
//       r.attendance_date,
//       r.employee_name || "",
//       r.role,
//       r.market_name || "",
//       r.city,
//       r.completed_tasks,
//       r.total_tasks,
//       r.status,
//     ]);

//     const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
//     const blob = new Blob([csvContent], { type: "text/csv" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `attendance_${selectedYear}.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//     toast.success("Attendance data exported successfully");
//   };

//   const months = eachMonthOfInterval({
//     start: startOfYear(new Date(selectedYear, 0)),
//     end: endOfYear(new Date(selectedYear, 0)),
//   });

//   return (
//     <AdminLayout>
//       {/* 12-col container */}
//       <div className="max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-12 gap-6">
//         {/* Sidebar */}
//         <aside className="col-span-12 md:col-span-4 lg:col-span-3">
//           <div className="sticky top-20">
//             <Card>
//               <CardContent className="p-4">
//                 <div className="flex items-center gap-2 mb-4">
//                   <CalendarIcon className="h-5 w-5 text-primary" />
//                   <h2 className="text-base font-semibold">Filters</h2>
//                 </div>

//                 <div className="space-y-4">
//                   {/* Role */}
//                   <div className="space-y-1.5">
//                     <label className="text-xs font-medium">Role</label>
//                     <Select value={selectedRole} onValueChange={setSelectedRole}>
//                       <SelectTrigger className="h-9">
//                         <SelectValue placeholder="All Roles" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Roles</SelectItem>
//                         <SelectItem value="employee">Employee</SelectItem>
//                         <SelectItem value="bdo">BDO</SelectItem>
//                         <SelectItem value="market_manager">Market Manager</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   {/* City */}
//                   <div className="space-y-1.5">
//                     <label className="text-xs font-medium">City</label>
//                     <Select value={selectedCity} onValueChange={setSelectedCity}>
//                       <SelectTrigger className="h-9">
//                         <SelectValue placeholder="All Cities" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Cities</SelectItem>
//                         {cities.map((city) => (
//                           <SelectItem key={city} value={city}>
//                             {city}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   {/* Market */}
//                   <div className="space-y-1.5">
//                     <label className="text-xs font-medium">Market</label>
//                     <Select value={selectedMarket} onValueChange={setSelectedMarket}>
//                       <SelectTrigger className="h-9">
//                         <SelectValue placeholder="All Markets" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Markets</SelectItem>
//                         {markets.map((market) => (
//                           <SelectItem key={market.id} value={market.id}>
//                             {market.name}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   {/* User Search */}
//                   <div className="space-y-1.5">
//                     <label className="text-xs font-medium">User Search</label>
//                     <Input
//                       className="h-9"
//                       placeholder="Search by name..."
//                       value={userSearch}
//                       onChange={(e) => setUserSearch(e.target.value)}
//                     />
//                   </div>

//                   {/* Legend */}
//                   <div className="pt-3 border-t space-y-2">
//                     <h3 className="text-xs font-semibold">Status Legend</h3>
//                     <div className="grid grid-cols-2 gap-2">
//                       <Legend color="bg-green-500" label="Full Day" />
//                       <Legend color="bg-orange-500" label="Half Day" />
//                       <Legend color="bg-red-500" label="Absent" />
//                       <Legend color="bg-blue-500" label="Weekly Off (Mon)" />
//                       <Legend color="bg-muted" label="No Data" />
//                     </div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </aside>

//         {/* Main */}
//         <main className="col-span-12 md:col-span-8 lg:col-span-9">
//           {/* Summary + Year controls */}
//           <div className="flex flex-col gap-4 mb-6 w-full items-start">
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full items-start justify-items-start">
//               <SummaryCard
//                 bg="bg-green-50 border-green-200"
//                 iconBg="bg-green-500"
//                 icon={<CheckCircle2 className="h-5 w-5 text-white" />}
//                 value={yearSummary.full_day}
//                 label="Present"
//                 labelColor="text-green-600"
//                 valueColor="text-green-700"
//               />
//               <SummaryCard
//                 bg="bg-orange-50 border-orange-200"
//                 iconBg="bg-orange-500"
//                 icon={<AlertCircle className="h-5 w-5 text-white" />}
//                 value={yearSummary.half_day}
//                 label="Half Day"
//                 labelColor="text-orange-600"
//                 valueColor="text-orange-700"
//               />
//               <SummaryCard
//                 bg="bg-red-50 border-red-200"
//                 iconBg="bg-red-500"
//                 icon={<XCircle className="h-5 w-5 text-white" />}
//                 value={yearSummary.absent}
//                 label="Absent"
//                 labelColor="text-red-600"
//                 valueColor="text-red-700"
//               />
//               <SummaryCard
//                 bg="bg-blue-50 border-blue-200"
//                 iconBg="bg-blue-500"
//                 icon={<MinusCircle className="h-5 w-5 text-white" />}
//                 value={yearSummary.weekly_off}
//                 label="Weekly Off"
//                 labelColor="text-blue-600"
//                 valueColor="text-blue-700"
//               />
//             </div>

//             <div className="flex items-center justify-start gap-4 flex-wrap">
//               <div className="flex items-center gap-2">
//                 <Button variant="outline" size="icon" onClick={() => setSelectedYear((y) => y - 1)}>
//                   <ChevronLeft className="h-4 w-4" />
//                 </Button>
//                 <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
//                   <SelectTrigger className="w-28">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
//                       <SelectItem key={year} value={year.toString()}>
//                         {year}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <Button variant="outline" size="icon" onClick={() => setSelectedYear((y) => y + 1)}>
//                   <ChevronRight className="h-4 w-4" />
//                 </Button>
//               </div>

//               <Button variant="outline" size="sm" onClick={exportToCSV}>
//                 <Download className="h-4 w-4 mr-2" />
//                 Export CSV
//               </Button>
//             </div>
//           </div>

//           {/* Calendars */}
//           <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
//             {months.map((monthDate) => (
//               <MiniMonthCalendar
//                 key={format(monthDate, "yyyy-MM")}
//                 monthDate={monthDate}
//                 dayMap={dayMap}
//                 onDayClick={handleDayClick}
//               />
//             ))}
//           </div>
//         </main>
//       </div>

//       {/* Drawer */}
//       <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
//         <DrawerContent className="max-h-[85vh]">
//           <DrawerHeader>
//             <div className="flex items-center justify-between">
//               <div>
//                 <DrawerTitle>
//                   Attendance Details – {selectedDay && format(new Date(selectedDay.date), "MMMM d, yyyy")}
//                 </DrawerTitle>
//                 <DrawerDescription>{selectedDay?.records.length} user(s) recorded</DrawerDescription>
//               </div>
//               <DrawerClose asChild>
//                 <Button variant="ghost" size="icon">
//                   <X className="h-4 w-4" />
//                 </Button>
//               </DrawerClose>
//             </div>
//           </DrawerHeader>

//           <ScrollArea className="max-h-[60vh] px-6">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>User</TableHead>
//                   <TableHead>Role</TableHead>
//                   <TableHead>Market</TableHead>
//                   <TableHead>City</TableHead>
//                   <TableHead className="text-center">Tasks Done/Total</TableHead>
//                   <TableHead className="text-center">Status</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {selectedDay?.records.map((record) => (
//                   <TableRow key={record.id}>
//                     <TableCell className="font-medium">{record.employee_name}</TableCell>
//                     <TableCell className="capitalize">{record.role.replace("_", " ")}</TableCell>
//                     <TableCell>{record.market_name}</TableCell>
//                     <TableCell>{record.city}</TableCell>
//                     <TableCell className="text-center">
//                       {record.completed_tasks}/{record.total_tasks}
//                     </TableCell>
//                     <TableCell className="text-center">
//                       <Badge
//                         variant={
//                           record.status === "full_day"
//                             ? "default"
//                             : record.status === "half_day"
//                               ? "secondary"
//                               : record.status === "absent"
//                                 ? "destructive"
//                                 : "outline"
//                         }
//                       >
//                         {STATUS_CONFIG[record.status].label}
//                       </Badge>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </ScrollArea>
//         </DrawerContent>
//       </Drawer>
//     </AdminLayout>
//   );
// }

// /* Helpers */

// function SummaryCard({
//   bg,
//   iconBg,
//   icon,
//   value,
//   label,
//   valueColor,
//   labelColor,
// }: {
//   bg: string;
//   iconBg: string;
//   icon: React.ReactNode;
//   value: number | string;
//   label: string;
//   valueColor: string;
//   labelColor: string;
// }) {
//   return (
//     <Card className={cn("border", bg)}>
//       <CardContent className="p-3">
//         <div className="flex items-center gap-3">
//           <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", iconBg)}>{icon}</div>
//           <div>
//             <div className={cn("text-2xl font-bold", valueColor)}>{value}</div>
//             <div className={cn("text-sm", labelColor)}>{label}</div>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// function Legend({ color, label }: { color: string; label: string }) {
//   return (
//     <div className="flex items-center gap-2">
//       <div className={cn("h-3 w-3 rounded", color)} />
//       <span className="text-xs">{label}</span>
//     </div>
//   );
// }

// /* Mini month calendar */

// interface MiniMonthCalendarProps {
//   monthDate: Date;
//   dayMap: Map<string, DayData>;
//   onDayClick: (dayData: DayData) => void;
// }

// function MiniMonthCalendar({ monthDate, dayMap, onDayClick }: MiniMonthCalendarProps) {
//   const daysInMonth = getDaysInMonth(monthDate);
//   const firstDayOfMonth = getDay(startOfMonth(monthDate));
//   const monthName = format(monthDate, "MMMM");

//   const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
//   const emptyDays = Array.from({ length: firstDayOfMonth }, () => 0);

//   return (
//     <div className="border border-border rounded-lg p-3 bg-card min-h-[260px]">
//       <h3 className="text-sm font-semibold mb-3 text-center">{monthName}</h3>

//       <div className="grid grid-cols-7 gap-px mb-1">
//         {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
//           <div key={i} className="text-[10px] text-muted-foreground text-center font-semibold py-1">
//             {d}
//           </div>
//         ))}
//       </div>

//       <div className="grid grid-cols-7 gap-px">
//         {emptyDays.map((_, i) => (
//           <div key={`e-${i}`} className="aspect-square" />
//         ))}
//         {days.map((day) => {
//           const dateStr = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), day), "yyyy-MM-dd");
//           const dayData = dayMap.get(dateStr);
//           return <DayCell key={day} day={day} dayData={dayData} onDayClick={onDayClick} />;
//         })}
//       </div>
//     </div>
//   );
// }

// interface DayCellProps {
//   day: number;
//   dayData?: DayData;
//   onDayClick: (dayData: DayData) => void;
// }

// function DayCell({ day, dayData, onDayClick }: DayCellProps) {
//   if (!dayData || dayData.records.length === 0) {
//     return (
//       <div className="aspect-square flex items-center justify-center text-[11px] text-muted-foreground rounded hover:bg-muted/50 transition-colors">
//         {day}
//       </div>
//     );
//   }

//   const { full_day, half_day, absent, weekly_off } = dayData.summary;
//   let majority: keyof typeof STATUS_CONFIG = "no_data";
//   let max = 0;
//   if (full_day > max) {
//     majority = "full_day";
//     max = full_day;
//   }
//   if (half_day > max) {
//     majority = "half_day";
//     max = half_day;
//   }
//   if (absent > max) {
//     majority = "absent";
//     max = absent;
//   }
//   if (weekly_off > max) {
//     majority = "weekly_off";
//     max = weekly_off;
//   }

//   const cfg = STATUS_CONFIG[majority];
//   const totalTasks = dayData.records.reduce((s, r) => s + r.total_tasks, 0);
//   const completedTasks = dayData.records.reduce((s, r) => s + r.completed_tasks, 0);

//   return (
//     <HoverCard openDelay={150}>
//       <HoverCardTrigger asChild>
//         <button
//           onClick={() => onDayClick(dayData)}
//           className={cn(
//             "aspect-square flex items-center justify-center text-[11px] font-semibold rounded cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-primary",
//             cfg.color,
//             "text-white",
//           )}
//           aria-label={`Open details for day ${day}`}
//         >
//           {day}
//         </button>
//       </HoverCardTrigger>
//       <HoverCardContent className="w-64" side="top">
//         <div className="space-y-2">
//           <div className="flex items-center justify-between">
//             <span className="font-semibold">{dayData.records.length} User(s)</span>
//             <Badge variant="outline" className="text-xs">
//               {cfg.label}
//             </Badge>
//           </div>
//           <div className="grid grid-cols-2 gap-2 text-sm">
//             <Legend color="bg-green-500" label={`Full: ${full_day}`} />
//             <Legend color="bg-orange-500" label={`Half: ${half_day}`} />
//             <Legend color="bg-red-500" label={`Absent: ${absent}`} />
//             <Legend color="bg-blue-500" label={`Off: ${weekly_off}`} />
//           </div>
//           <div className="pt-2 border-t text-xs text-muted-foreground">
//             Tasks: {completedTasks}/{totalTasks} completed
//           </div>
//         </div>
//       </HoverCardContent>
//     </HoverCard>
//   );
// }

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

import { Download, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from "lucide-react";

import { format, startOfYear, endOfYear, eachMonthOfInterval, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, XCircle, MinusCircle } from "lucide-react";

/* --- INTERFACES ---- */

interface AttendanceRecord {
  id: string;
  user_id: string;
  attendance_date: string;
  role: string;
  market_id: string;
  city: string;
  total_tasks: number;
  completed_tasks: number;
  status: "full_day" | "half_day" | "absent" | "weekly_off";
  employee_name?: string;
  market_name?: string;
}

interface DayData {
  date: string;
  records: AttendanceRecord[];
  summary: {
    full_day: number;
    half_day: number;
    absent: number;
    weekly_off: number;
  };
}

/* ---- STATUS COLORS ---- */
const STATUS_CONFIG = {
  full_day: { label: "Full Day", color: "bg-green-500", icon: CheckCircle2 },
  half_day: { label: "Half Day", color: "bg-orange-500", icon: AlertCircle },
  absent: { label: "Absent", color: "bg-red-500", icon: XCircle },
  weekly_off: { label: "Weekly Off", color: "bg-blue-500", icon: MinusCircle },
  no_data: { label: "No Data", color: "bg-muted", icon: MinusCircle },
};

export default function AttendanceReporting() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedMarket, setSelectedMarket] = useState<string>("all");
  const [userSearch, setUserSearch] = useState<string>("");

  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dayMap, setDayMap] = useState<Map<string, DayData>>(new Map());

  const [yearSummary, setYearSummary] = useState({
    full_day: 0,
    half_day: 0,
    absent: 0,
    weekly_off: 0,
  });

  /* --- FETCH MARKETS ---- */
  useEffect(() => {
    fetchMarkets();
  }, []);

  /* --- FETCH RECORDS WHEN FILTERS CHANGE ---- */
  useEffect(() => {
    fetchRecords();
  }, [selectedYear, selectedRole, selectedCity, selectedMarket, userSearch, markets]);

  const fetchMarkets = async () => {
    const { data } = await supabase.from("markets").select("id, name, city").eq("is_active", true).order("name");

    if (data) {
      setMarkets(data);
      const uniqueCities = [...new Set(data.map((m) => m.city).filter(Boolean))];
      setCities(uniqueCities as string[]);
    }
  };

  /* ---- FETCH ATTENDANCE ---- */
  const fetchRecords = async () => {
    setLoading(true);

    const startDate = format(startOfYear(new Date(selectedYear, 0)), "yyyy-MM-dd");
    const endDate = format(endOfYear(new Date(selectedYear, 0)), "yyyy-MM-dd");

    let query = supabase
      .from("attendance_records")
      .select("*")
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate);

    if (selectedRole !== "all") query = query.eq("role", selectedRole as Database["public"]["Enums"]["user_role"]);
    if (selectedCity !== "all") query = query.eq("city", selectedCity);
    if (selectedMarket !== "all") query = query.eq("market_id", selectedMarket);

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to fetch attendance records");
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      (data || []).map(async (record) => {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", record.user_id).single();

        const market = markets.find((m) => m.id === record.market_id);

        return {
          ...record,
          employee_name: profile?.full_name || "Unknown",
          market_name: market?.name || "Unknown",
        };
      }),
    );

    let filtered = enriched;
    if (userSearch) {
      filtered = enriched.filter((r) => r.employee_name?.toLowerCase().includes(userSearch.toLowerCase()));
    }

    setRecords(filtered);

    const map = new Map<string, DayData>();
    filtered.forEach((record) => {
      const dateStr = record.attendance_date;
      if (!map.has(dateStr)) {
        map.set(dateStr, {
          date: dateStr,
          records: [],
          summary: { full_day: 0, half_day: 0, absent: 0, weekly_off: 0 },
        });
      }
      const d = map.get(dateStr)!;
      d.records.push(record);
      d.summary[record.status]++;
    });

    setDayMap(map);

    const summary = { full_day: 0, half_day: 0, absent: 0, weekly_off: 0 };
    filtered.forEach((record) => summary[record.status]++);
    setYearSummary(summary);

    setLoading(false);
  };

  const handleDayClick = (dayData: DayData) => {
    setSelectedDay(dayData);
    setDrawerOpen(true);
  };

  const exportCSV = () => {
    const headers = ["Date", "User", "Role", "Market", "City", "Tasks Done", "Total Tasks", "Status"];
    const rows = records.map((r) => [
      r.attendance_date,
      r.employee_name,
      r.role,
      r.market_name,
      r.city,
      r.completed_tasks,
      r.total_tasks,
      r.status,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const months = eachMonthOfInterval({
    start: startOfYear(new Date(selectedYear, 0)),
    end: endOfYear(new Date(selectedYear, 0)),
  });

  return (
    <AdminLayout>
      {/* LEFT ALIGNED PAGE — NO CENTER SPACE */}
      <div className="w-full px-4 py-6 grid grid-cols-12 gap-6">
        {/* FILTER SIDEBAR */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 order-1">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Filters</h2>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="bdo">BDO</SelectItem>
                    <SelectItem value="market_manager">Market Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="space-y-1.5 mt-3">
                <label className="text-xs font-medium">City</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Market */}
              <div className="space-y-1.5 mt-3">
                <label className="text-xs font-medium">Market</label>
                <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Markets</SelectItem>
                    {markets.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Search */}
              <div className="space-y-1.5 mt-3">
                <label className="text-xs font-medium">User Search</label>
                <Input
                  className="h-9"
                  placeholder="Search by name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* MAIN CONTENT */}
        <main className="col-span-12 md:col-span-8 lg:col-span-9 order-2">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <SummaryCard
              bg="bg-green-50 border-green-200"
              iconBg="bg-green-500"
              icon={<CheckCircle2 className="h-5 w-5 text-white" />}
              value={yearSummary.full_day}
              label="Present"
              labelColor="text-green-600"
              valueColor="text-green-700"
            />
            <SummaryCard
              bg="bg-orange-50 border-orange-200"
              iconBg="bg-orange-500"
              icon={<AlertCircle className="h-5 w-5 text-white" />}
              value={yearSummary.half_day}
              label="Half Day"
              labelColor="text-orange-600"
              valueColor="text-orange-700"
            />
            <SummaryCard
              bg="bg-red-50 border-red-200"
              iconBg="bg-red-500"
              icon={<XCircle className="h-5 w-5 text-white" />}
              value={yearSummary.absent}
              label="Absent"
              labelColor="text-red-600"
              valueColor="text-red-700"
            />
            <SummaryCard
              bg="bg-blue-50 border-blue-200"
              iconBg="bg-blue-500"
              icon={<MinusCircle className="h-5 w-5 text-white" />}
              value={yearSummary.weekly_off}
              label="Weekly Off"
              labelColor="text-blue-600"
              valueColor="text-blue-700"
            />
          </div>

          {/* YEAR SELECTOR & EXPORT */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedYear((y) => y - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => setSelectedYear((y) => y + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* CALENDAR GRID */}
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {months.map((month) => (
              <MiniMonthCalendar
                key={format(month, "yyyy-MM")}
                monthDate={month}
                dayMap={dayMap}
                onDayClick={handleDayClick}
              />
            ))}
          </div>
        </main>
      </div>

      {/* DETAILS DRAWER */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>
                  Attendance – {selectedDay && format(new Date(selectedDay.date), "MMMM d, yyyy")}
                </DrawerTitle>
                <DrawerDescription>{selectedDay?.records.length} Users</DrawerDescription>
              </div>

              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <ScrollArea className="max-h-[65vh] px-6 pb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-center">Tasks</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {selectedDay?.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.employee_name}</TableCell>
                    <TableCell>{record.role}</TableCell>
                    <TableCell>{record.market_name}</TableCell>
                    <TableCell>{record.city}</TableCell>
                    <TableCell className="text-center">
                      {record.completed_tasks}/{record.total_tasks}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge>{STATUS_CONFIG[record.status].label}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </AdminLayout>
  );
}

/* --- HELPER COMPONENTS --- */

function SummaryCard({ bg, iconBg, icon, value, label, valueColor, labelColor }: any) {
  return (
    <Card className={cn("border", bg)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", iconBg)}>{icon}</div>
          <div>
            <div className={cn("text-2xl font-bold", valueColor)}>{value}</div>
            <div className={cn("text-sm", labelColor)}>{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMonthCalendar({ monthDate, dayMap, onDayClick }: any) {
  const daysInMonth = getDaysInMonth(monthDate);
  const firstDay = getDay(startOfMonth(monthDate));
  const monthName = format(monthDate, "MMMM");

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="border border-border rounded-lg p-3 bg-card min-h-[260px]">
      <h3 className="text-sm font-semibold mb-3 text-center">{monthName}</h3>

      <div className="grid grid-cols-7 gap-px mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-[10px] text-muted-foreground text-center font-semibold py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {blanks.map((_, i) => (
          <div key={i} className="aspect-square" />
        ))}

        {days.map((day) => {
          const dateStr = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), day), "yyyy-MM-dd");
          return <DayCell key={day} day={day} dayData={dayMap.get(dateStr)} onDayClick={onDayClick} />;
        })}
      </div>
    </div>
  );
}

function DayCell({ day, dayData, onDayClick }: any) {
  if (!dayData) {
    return (
      <div className="aspect-square flex items-center justify-center text-[11px] text-muted-foreground rounded">
        {day}
      </div>
    );
  }

  const { full_day, half_day, absent, weekly_off } = dayData.summary;
  let majority: keyof typeof STATUS_CONFIG = "no_data";
  let max = -1;

  if (full_day > max) {
    majority = "full_day";
    max = full_day;
  }
  if (half_day > max) {
    majority = "half_day";
    max = half_day;
  }
  if (absent > max) {
    majority = "absent";
    max = absent;
  }
  if (weekly_off > max) {
    majority = "weekly_off";
    max = weekly_off;
  }

  const cfg = STATUS_CONFIG[majority];

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <button
          onClick={() => onDayClick(dayData)}
          className={cn(
            "aspect-square flex items-center justify-center text-[11px] font-semibold rounded cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-primary",
            cfg.color,
            "text-white",
          )}
        >
          {day}
        </button>
      </HoverCardTrigger>

      <HoverCardContent className="w-64" side="top">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{dayData.records.length} Users</span>
            <Badge variant="outline" className="text-xs">
              {cfg.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Legend color="bg-green-500" label={`Full: ${full_day}`} />
            <Legend color="bg-orange-500" label={`Half: ${half_day}`} />
            <Legend color="bg-red-500" label={`Absent: ${absent}`} />
            <Legend color="bg-blue-500" label={`Off: ${weekly_off}`} />
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function Legend({ color, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-3 w-3 rounded", color)} />
      <span className="text-xs">{label}</span>
    </div>
  );
}
