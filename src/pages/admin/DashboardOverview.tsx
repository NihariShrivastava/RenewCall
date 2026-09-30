import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/common/StatCard';
import { getDashboardOverviewStats, getAllLeadsRaw } from '../../lib/db';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  UserCheck, 
  FileSpreadsheet, 
  Calendar, 
  ArrowUpRight 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { formatDate } from '../../lib/utils';
import { Link } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  unassigned: '#64748b',
  pending: '#f59e0b',
  done: '#22c55e',
  closed: '#ef4444',
  reverted: '#8b5cf6',
};

export const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    unassigned: 0,
    pending: 0,
    done: 0,
    closed: 0,
    reverted: 0,
    totalTelecallers: 0,
    dueNext7Days: 0,
    dueNext30Days: 0,
  });
  const [leadsOverTime, setLeadsOverTime] = useState<{ date: string; count: number }[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [upcomingDueBars, setUpcomingDueBars] = useState<{ category: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const data = await getDashboardOverviewStats();
      const leads = await getAllLeadsRaw();

      setStats(data);

      // Status Donut Chart data
      const statusData = [
        { name: 'Pending', value: data.pending, color: '#f59e0b' },
        { name: 'Done', value: data.done, color: '#22c55e' },
        { name: 'Unassigned', value: data.unassigned, color: '#64748b' },
        { name: 'Closed', value: data.closed, color: '#ef4444' },
        { name: 'Reverted', value: data.reverted, color: '#8b5cf6' },
      ].filter(s => s.value > 0);

      setStatusDistribution(statusData.length > 0 ? statusData : [{ name: 'No Data', value: 1, color: '#252840' }]);

      // Leads Over Time (grouping by created_at date)
      const dateMap: Record<string, number> = {};
      leads.forEach(l => {
        const dStr = formatDate(l.created_at);
        dateMap[dStr] = (dateMap[dStr] || 0) + 1;
      });

      const timePoints = Object.entries(dateMap).map(([date, count]) => ({
        date,
        count
      }));

      // Genuine leads over time data
      setLeadsOverTime(timePoints);

      // Renewals Due Next 7 / 30 Days Bar data
      setUpcomingDueBars([
        { category: 'Due in 7 Days', count: data.dueNext7Days },
        { category: 'Due in 30 Days', count: data.dueNext30Days },
        { category: 'Overdue / Immediate', count: leads.filter(l => l.status === 'pending' && l.policy_date < new Date().toISOString().split('T')[0]).length },
      ]);
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Header Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Dashboard Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time renewal metrics, telecaller allocation, and conversion activity.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/admin/upload"
            className="px-4 py-2 rounded-xl gradient-btn text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload New Excel</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={stats.total.toLocaleString()}
          icon={FileSpreadsheet}
          iconColor="blue"
          subValue="Total renewals registered"
        />
        <StatCard
          label="Pending Reminders"
          value={stats.pending.toLocaleString()}
          icon={Clock}
          iconColor="yellow"
          subValue="Active in telecaller roster"
        />
        <StatCard
          label="Insurance Done"
          value={stats.done.toLocaleString()}
          icon={CheckCircle2}
          iconColor="green"
          trend={stats.total > 0 ? `${Math.round((stats.done / stats.total) * 100)}% Conversion` : ''}
          subValue="Policies successfully renewed"
        />
        <StatCard
          label="Active Telecallers"
          value={stats.totalTelecallers}
          icon={UserCheck}
          iconColor="purple"
          subValue="Agents handling roster calls"
        />
      </div>

      {/* Secondary Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#161926] border border-[#252840] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Unassigned Leads</p>
            <h4 className="text-xl font-bold text-slate-200 mt-0.5">{stats.unassigned}</h4>
          </div>
          <Link to="/admin/leads?status=unassigned" className="p-2 rounded-lg bg-[#0e1017] text-[#4f6ef7] hover:bg-[#1f2338]">
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-[#161926] border border-[#252840] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Reverted to Admin</p>
            <h4 className="text-xl font-bold text-[#8b5cf6] mt-0.5">{stats.reverted}</h4>
          </div>
          <Link to="/admin/reverted" className="p-2 rounded-lg bg-[#0e1017] text-[#8b5cf6] hover:bg-[#1f2338]">
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-[#161926] border border-[#252840] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Closed / Lost</p>
            <h4 className="text-xl font-bold text-rose-400 mt-0.5">{stats.closed}</h4>
          </div>
          <Link to="/admin/leads?status=closed" className="p-2 rounded-lg bg-[#0e1017] text-rose-400 hover:bg-[#1f2338]">
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Leads Uploaded Over Time */}
        <div className="lg:col-span-2 bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Leads Uploaded Over Time</h3>
              <p className="text-xs text-slate-400 mt-0.5">Submission velocity and lead generation rate</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252840" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#252840' }} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#252840' }} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161926',
                    borderColor: '#252840',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4f6ef7"
                  strokeWidth={3}
                  dot={{ fill: '#4f6ef7', r: 4, strokeWidth: 2, stroke: '#0e1017' }}
                  activeDot={{ r: 6, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Status Distribution */}
        <div className="bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Status Distribution</h3>
            <p className="text-xs text-slate-400 mt-0.5">Current lead allocation breakdown</p>
          </div>

          <div className="h-60 w-full relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  innerRadius={65}
                  outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161926',
                    borderColor: '#252840',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white">{stats.total}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Leads</span>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#252840]">
            {statusDistribution.map((s) => (
              <div key={s.name} className="flex items-center space-x-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                <span className="text-slate-400 truncate">{s.name}:</span>
                <span className="font-semibold text-white ml-auto">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Renewals Due in Next 7/30 Days Bar Chart */}
      <div className="bg-[#161926] border border-[#252840] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Renewals Due & Expiry Timeline</h3>
            <p className="text-xs text-slate-400 mt-0.5">Upcoming policy expirations requiring active reminders</p>
          </div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={upcomingDueBars}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252840" vertical={false} />
              <XAxis dataKey="category" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161926',
                  borderColor: '#252840',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
