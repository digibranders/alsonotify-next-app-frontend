'use client';

import { useState, useEffect } from 'react';
import { useTabSync } from '@/hooks/useTabSync';
import { Users, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { PageLayout } from '../../layout/PageLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { FilterBar, FilterOption } from '../../ui/FilterBar';
import { Modal } from 'antd';
import { Skeleton } from '../../ui/Skeleton';

interface EmployeeWorkload {
  id: string;
  name: string;
  role: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  total: number;
  capacity: number;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
}

const employeeWorkloadData: EmployeeWorkload[] = [
  {
    id: '1',
    name: 'Satyam Yadav',
    role: 'Designer',
    monday: 8,
    tuesday: 7.5,
    wednesday: 8,
    thursday: 6,
    friday: 8,
    saturday: 0,
    sunday: 0,
    total: 37.5,
    capacity: 40,
    week1: 38,
    week2: 40,
    week3: 37.5,
    week4: 36
  },
  {
    id: '2',
    name: 'Appurva Panchabhai',
    role: 'Project Manager',
    monday: 8,
    tuesday: 8,
    wednesday: 8,
    thursday: 8,
    friday: 7,
    saturday: 0,
    sunday: 0,
    total: 39,
    capacity: 40,
    week1: 40,
    week2: 39,
    week3: 39,
    week4: 38.5
  },
  {
    id: '3',
    name: 'Pranita Kadav',
    role: 'SEO Executive',
    monday: 7,
    tuesday: 8,
    wednesday: 7.5,
    thursday: 8,
    friday: 8,
    saturday: 0,
    sunday: 0,
    total: 38.5,
    capacity: 40,
    week1: 39,
    week2: 38.5,
    week3: 38.5,
    week4: 37
  },

  {
    id: '4',
    name: 'Sharifudeen',
    role: 'Developer',
    monday: 9,
    tuesday: 8.5,
    wednesday: 9,
    thursday: 8,
    friday: 9,
    saturday: 4,
    sunday: 0,
    total: 47.5,
    capacity: 40,
    week1: 45,
    week2: 47.5,
    week3: 48,
    week4: 46
  },
  {
    id: '5',
    name: 'Farheen',
    role: 'Web Developer',
    monday: 7,
    tuesday: 7,
    wednesday: 6.5,
    thursday: 7,
    friday: 7,
    saturday: 0,
    sunday: 0,
    total: 34.5,
    capacity: 40,
    week1: 35,
    week2: 34.5,
    week3: 34,
    week4: 36
  },
  {
    id: '6',
    name: 'Siddique Ahmed',
    role: 'Full Stack Developer',
    monday: 8.5,
    tuesday: 9,
    wednesday: 8,
    thursday: 9,
    friday: 8.5,
    saturday: 0,
    sunday: 0,
    total: 43,
    capacity: 40,
    week1: 42,
    week2: 43,
    week3: 43.5,
    week4: 41
  },
  {
    id: '7',
    name: 'Yusuf Sheikh',
    role: 'Backend Developer',
    monday: 8,
    tuesday: 7.5,
    wednesday: 8,
    thursday: 7,
    friday: 8,
    saturday: 0,
    sunday: 0,
    total: 38.5,
    capacity: 40,
    week1: 39,
    week2: 38.5,
    week3: 38,
    week4: 39.5
  },
  {
    id: '8',
    name: 'Priya Sharma',
    role: 'UI/UX Designer',
    monday: 7.5,
    tuesday: 8,
    wednesday: 7,
    thursday: 8,
    friday: 7.5,
    saturday: 0,
    sunday: 0,
    total: 38,
    capacity: 40,
    week1: 37.5,
    week2: 38,
    week3: 38.5,
    week4: 37
  },
  {
    id: '9',
    name: 'Rahul Verma',
    role: 'DevOps Engineer',
    monday: 9,
    tuesday: 9,
    wednesday: 8.5,
    thursday: 9,
    friday: 9,
    saturday: 5,
    sunday: 0,
    total: 49.5,
    capacity: 40,
    week1: 48,
    week2: 49.5,
    week3: 50,
    week4: 47
  },
  {
    id: '10',
    name: 'Neha Patel',
    role: 'Content Writer',
    monday: 6.5,
    tuesday: 7,
    wednesday: 6,
    thursday: 7,
    friday: 6.5,
    saturday: 0,
    sunday: 0,
    total: 33,
    capacity: 40,
    week1: 34,
    week2: 33,
    week3: 32.5,
    week4: 35
  },
  {
    id: '11',
    name: 'Amit Kumar',
    role: 'QA Engineer',
    monday: 8,
    tuesday: 8,
    wednesday: 7.5,
    thursday: 8,
    friday: 8,
    saturday: 0,
    sunday: 0,
    total: 39.5,
    capacity: 40,
    week1: 40,
    week2: 39.5,
    week3: 39,
    week4: 40
  },
  {
    id: '12',
    name: 'Sneha Desai',
    role: 'Marketing Manager',
    monday: 7.5,
    tuesday: 8,
    wednesday: 8,
    thursday: 7,
    friday: 8,
    saturday: 0,
    sunday: 0,
    total: 38.5,
    capacity: 40,
    week1: 39,
    week2: 38.5,
    week3: 38,
    week4: 39
  },
  {
    id: '13',
    name: 'Arjun Singh',
    role: 'Frontend Developer',
    monday: 8.5,
    tuesday: 8,
    wednesday: 9,
    thursday: 8.5,
    friday: 8,
    saturday: 0,
    sunday: 0,
    total: 42,
    capacity: 40,
    week1: 41,
    week2: 42,
    week3: 42.5,
    week4: 40.5
  },
  {
    id: '14',
    name: 'Kavya Nair',
    role: 'Graphic Designer',
    monday: 6,
    tuesday: 6.5,
    wednesday: 6,
    thursday: 5.5,
    friday: 6,
    saturday: 0,
    sunday: 0,
    total: 30,
    capacity: 40,
    week1: 31,
    week2: 30,
    week3: 29.5,
    week4: 32
  },
  {
    id: '15',
    name: 'Vikram Malhotra',
    role: 'Business Analyst',
    monday: 8,
    tuesday: 7.5,
    wednesday: 8,
    thursday: 8,
    friday: 7.5,
    saturday: 0,
    sunday: 0,
    total: 39,
    capacity: 40,
    week1: 38.5,
    week2: 39,
    week3: 39.5,
    week4: 38
  }
];

export function WorkloadChartPage() {
  const [activeTab, setActiveTab] = useTabSync<'daily' | 'week' | 'analytics' | 'monthly'>({
    defaultTab: 'analytics',
    validTabs: ['daily', 'week', 'analytics', 'monthly']
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    role: 'All',
    utilization: 'All'
  });
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWorkload | null>(null);

  // Calculate statistics
  const totalWeeklyHours = employeeWorkloadData.reduce((sum, emp) => sum + emp.total, 0);
  const averageUtilization = (totalWeeklyHours / (employeeWorkloadData.length * 40)) * 100;
  const overloadedEmployees = employeeWorkloadData.filter(emp => emp.total > emp.capacity).length;
  // const underutilizedEmployees = employeeWorkloadData.filter(emp => emp.total < emp.capacity * 0.8).length; // Unused

  const getBarColor = (hours: number, capacity: number) => {
    const utilization = (hours / capacity) * 100;
    if (utilization > 100) return '#ff3b3b';
    if (utilization >= 90) return '#FF9800';
    if (utilization >= 70) return '#4CAF50';
    return '#2196F3';
  };

  const filteredEmployees = employeeWorkloadData.filter(emp => {
    const matchesSearch = searchQuery === '' ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filters.role === 'All' || emp.role === filters.role;

    const empUtilization = (emp.total / emp.capacity) * 100;
    let matchesUtilization = true;
    if (filters.utilization === 'Overloaded') matchesUtilization = empUtilization > 100;
    else if (filters.utilization === 'High') matchesUtilization = empUtilization >= 90 && empUtilization <= 100;
    else if (filters.utilization === 'Normal') matchesUtilization = empUtilization >= 70 && empUtilization < 90;
    else if (filters.utilization === 'Low') matchesUtilization = empUtilization < 70;

    return matchesSearch && matchesRole && matchesUtilization;
  });

  // Get unique roles for filter
  const roles = ['All', ...Array.from(new Set(employeeWorkloadData.map(e => e.role)))];

  const filterOptions: FilterOption[] = [
    {
      id: 'role',
      label: 'Role',
      options: roles,
      placeholder: 'Role',
      defaultValue: 'All'
    },
    {
      id: 'utilization',
      label: 'Utilization',
      options: ['All', 'Overloaded', 'High', 'Normal', 'Low'],
      placeholder: 'Utilization Level',
      defaultValue: 'All'
    }
  ];

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  };

  const clearFilters = () => {
    setFilters({ role: 'All', utilization: 'All' });
    setSearchQuery('');
  };

  // Prepare data for different views
  const getDailyChartData = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    return days.map((day, index) => {
      const totalHours = employeeWorkloadData.reduce((sum, emp) => sum + (emp[dayKeys[index]] as number), 0);
      return {
        day: day.substring(0, 3),
        hours: totalHours,
        average: totalHours / employeeWorkloadData.length
      };
    });
  };

  const getWeeklyChartData = () => {
    return employeeWorkloadData.map(emp => ({
      name: emp.name.split(' ')[0],
      hours: emp.total,
      capacity: emp.capacity,
      utilization: (emp.total / emp.capacity) * 100
    }));
  };

  const getMonthlyChartData = () => {
    return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, index) => {
      const weekKey = `week${index + 1}` as keyof EmployeeWorkload;
      const totalHours = employeeWorkloadData.reduce((sum, emp) => sum + (emp[weekKey] as number), 0);
      return {
        week,
        hours: totalHours,
        average: totalHours / employeeWorkloadData.length,
        capacity: employeeWorkloadData.length * 40
      };
    });
  };

  const renderChart = () => {
    if (activeTab === 'daily') {
      const dailyData = getDailyChartData();
      return (
        <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-6 mb-6">
          <h3 className="font-['Manrope:SemiBold',sans-serif] text-[15px] text-[#111111] mb-4">
            Daily Workload Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300} minHeight={300} minWidth={0}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3b3b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff3b3b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#666666', fontSize: 12, fontFamily: 'Manrope' }}
              />
              <YAxis
                tick={{ fill: '#666666', fontSize: 12, fontFamily: 'Manrope' }}
                label={{ value: 'Total Hours', angle: -90, position: 'insideLeft', style: { fill: '#666666', fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #EEEEEE',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#ff3b3b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorHours)"
                name="Total Hours"
              />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#666666"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                dot={false}
                name="Average"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    } else if (activeTab === 'week') {
      const weeklyData = getWeeklyChartData();
      return (
        <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-6 mb-6">
          <h3 className="font-['Manrope:SemiBold',sans-serif] text-[15px] text-[#111111] mb-4">
            Weekly Workload Overview
          </h3>
          <ResponsiveContainer width="100%" height={300} minHeight={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#666666', fontSize: 12, fontFamily: 'Manrope' }}
              />
              <YAxis
                tick={{ fill: '#666666', fontSize: 12, fontFamily: 'Manrope' }}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: '#666666', fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #EEEEEE',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', fontFamily: 'Manrope' }}
              />
              <Bar dataKey="hours" name="Actual Hours" radius={[8, 8, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.hours, entry.capacity)} />
                ))}
              </Bar>
              <Bar dataKey="capacity" name="Capacity" fill="#DDDDDD" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#2196F3]" />
              <span className="text-[12px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                Under 70%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#4CAF50]" />
              <span className="text-[12px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                70-90%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#FF9800]" />
              <span className="text-[12px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                90-100%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#ff3b3b]" />
              <span className="text-[12px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                Over 100%
              </span>
            </div>
          </div>
        </div>
      );
    } else if (activeTab === 'monthly') {
      const monthlyData = getMonthlyChartData();
      return (
        <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-6 mb-6">
          <h3 className="font-['Manrope:SemiBold',sans-serif] text-[15px] text-[#111111] mb-4">
            Monthly Workload Trend
          </h3>
          <ResponsiveContainer width="100%" height={300} minHeight={300} minWidth={0}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#666666', fontSize: 12, fontFamily: 'Manrope' }}
              />
              <YAxis
                tick={{ fill: '#666666', fontSize: 12, fontFamily: 'Manrope' }}
                label={{ value: 'Total Hours', angle: -90, position: 'insideLeft', style: { fill: '#666666', fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #EEEEEE',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', fontFamily: 'Manrope' }}
              />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#ff3b3b"
                strokeWidth={3}
                dot={{ fill: '#ff3b3b', r: 5 }}
                name="Total Hours"
              />
              <Line
                type="monotone"
                dataKey="capacity"
                stroke="#DDDDDD"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#DDDDDD', r: 4 }}
                name="Team Capacity"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    } else {
      // Analytics view - combined view
      const weeklyData = getWeeklyChartData();
      return (
        <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-6 mb-6">
          <h3 className="font-['Manrope:SemiBold',sans-serif] text-[15px] text-[#111111] mb-4">
            Team Workload Analytics
          </h3>
          <ResponsiveContainer width="100%" height={300} minHeight={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#666666', fontSize: 12, fontFamily: 'Manrope' }}
              />
              <YAxis
                tick={{ fill: '#666666', fontSize: 12, fontFamily: 'Manrope' }}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: '#666666', fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #EEEEEE',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', fontFamily: 'Manrope' }}
              />
              <Bar dataKey="hours" name="Actual Hours" radius={[8, 8, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.hours, entry.capacity)} />
                ))}
              </Bar>
              <Bar dataKey="capacity" name="Capacity" fill="#DDDDDD" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#2196F3]" />
              <span className="text-[12px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                Under 70%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#4CAF50]" />
              <span className="text-[12px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                70-90%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#FF9800]" />
              <span className="text-[12px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                90-100%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#ff3b3b]" />
              <span className="text-[12px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                Over 100%
              </span>
            </div>
          </div>
        </div>
      );
    }
  };

  const renderSkeletonStats = () => (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-[#EEEEEE] rounded-[16px] p-5 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );

  const renderSkeletonChart = () => (
    <div className="bg-white border border-[#EEEEEE] rounded-[16px] p-6 mb-6 animate-pulse">
      <Skeleton className="h-5 w-48 mb-6" />
      <Skeleton className="h-[300px] w-full rounded-[8px]" />
    </div>
  );

  const renderSkeletonEmployeeList = () => (
    <div className="space-y-4 animate-pulse">
      <Skeleton className="h-5 w-32 mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-[#F7F7F7] rounded-[16px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <PageLayout
      title="Workload Chart"
      tabs={[
        { id: 'daily', label: 'Daily' },
        { id: 'week', label: 'Week' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'monthly', label: 'Monthly' }
      ]}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as any)}
    >
      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar
          filters={filterOptions}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          searchPlaceholder="Search employees..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Statistics Cards */}
      {loading ? renderSkeletonStats() : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-[#EEEEEE] rounded-[16px] p-5">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-[#666666]" />
              <span className="text-[11px] font-['Manrope:Medium',sans-serif] text-[#999999]">
                Total Employees
              </span>
            </div>
            <p className="font-['Manrope:Bold',sans-serif] text-[24px] text-[#111111]">
              {employeeWorkloadData.length}
            </p>
          </div>

          <div className="border border-[#EEEEEE] rounded-[16px] p-5">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-[#4CAF50]" />
              <span className="text-[11px] font-['Manrope:Medium',sans-serif] text-[#999999]">
                Total Hours
              </span>
            </div>
            <p className="font-['Manrope:Bold',sans-serif] text-[24px] text-[#111111]">
              {totalWeeklyHours.toFixed(1)}h
            </p>
          </div>

          <div className="border border-[#EEEEEE] rounded-[16px] p-5">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-[#2196F3]" />
              <span className="text-[11px] font-['Manrope:Medium',sans-serif] text-[#999999]">
                Avg Utilization
              </span>
            </div>
            <p className="font-['Manrope:Bold',sans-serif] text-[24px] text-[#111111]">
              {averageUtilization.toFixed(1)}%
            </p>
          </div>

          <div className="border border-[#EEEEEE] rounded-[16px] p-5">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 text-[#ff3b3b]" />
              <span className="text-[11px] font-['Manrope:Medium',sans-serif] text-[#999999]">
                Overloaded
              </span>
            </div>
            <p className="font-['Manrope:Bold',sans-serif] text-[24px] text-[#111111]">
              {overloadedEmployees}
            </p>
          </div>
        </div>
      )}

      {/* Chart based on active tab */}
      {loading ? renderSkeletonChart() : renderChart()}

      {/* Employee Workload Details */}
      <div className="flex-1 overflow-y-auto">
        {loading ? renderSkeletonEmployeeList() : (
          <>
            <h3 className="font-['Manrope:SemiBold',sans-serif] text-[15px] text-[#111111] mb-4">
              Employee Details
            </h3>
            <div className="space-y-3">
              {filteredEmployees.map((employee) => {
                const utilization = (employee.total / employee.capacity) * 100;
                const utilizationColor =
                  utilization > 100
                    ? '#ff3b3b'
                    : utilization >= 90
                      ? '#FF9800'
                      : utilization >= 70
                        ? '#4CAF50'
                        : '#2196F3';

                return (
                  <div
                    key={employee.id}
                    onClick={() => setSelectedEmployee(employee)}
                    className="bg-[#F7F7F7] rounded-[16px] p-5 hover:bg-[#EEEEEE] transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-['Manrope:SemiBold',sans-serif] text-[14px] text-[#111111] mb-1">
                          {employee.name}
                        </h4>
                        <p className="text-[12px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                          {employee.role}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-['Manrope:Bold',sans-serif] text-[18px] text-[#111111]">
                          {employee.total}h
                        </p>
                        <p className="text-[11px] font-['Manrope:Regular',sans-serif] text-[#666666]">
                          of {employee.capacity}h
                        </p>
                      </div>
                    </div>

                    {/* Utilization Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-['Manrope:Medium',sans-serif] text-[#666666]">
                          Utilization
                        </span>
                        <span
                          className="text-[11px] font-['Manrope:SemiBold',sans-serif]"
                          style={{ color: utilizationColor }}
                        >
                          {utilization.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(utilization, 100)}%`,
                            backgroundColor: utilizationColor
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Employee Details Modal */}
      <Modal
        open={!!selectedEmployee}
        onCancel={() => setSelectedEmployee(null)}
        width={500}
        centered
        className="rounded-[16px] overflow-hidden"
      >
        {selectedEmployee && (
          <div className="p-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[20px] font-['Manrope:Bold',sans-serif] text-[#111111]">{selectedEmployee.name}</h2>
                <p className="text-[13px] text-[#666666] font-['Manrope:Medium',sans-serif]">{selectedEmployee.role}</p>
              </div>
              <div className="text-right">
                <p className="text-[24px] font-['Manrope:Bold',sans-serif] text-[#111111]">{selectedEmployee.total}h</p>
                <p className="text-[12px] text-[#666666] font-['Manrope:Regular',sans-serif]">Total Hours</p>
              </div>
            </div>

            <h3 className="text-[14px] font-['Manrope:SemiBold',sans-serif] text-[#111111] mb-3">Daily Breakdown</h3>
            <div className="space-y-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const key = day.toLowerCase() as keyof EmployeeWorkload;
                const hours = selectedEmployee[key] as number;
                return (
                  <div key={day} className="flex items-center justify-between p-3 bg-[#F7F7F7] rounded-lg">
                    <span className="text-[13px] font-['Manrope:Medium',sans-serif] text-[#666666]">{day}</span>
                    <span className="text-[13px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">{hours > 0 ? `${hours}h` : '-'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>

    </PageLayout>
  );
}

export default WorkloadChartPage;