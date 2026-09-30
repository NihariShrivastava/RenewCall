import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  FileSpreadsheet, 
  PieChart, 
  ShieldCheck, 
  BarChart3, 
  RotateCcw, 
  Layers 
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard Overview', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Upload Excel', path: '/admin/upload', icon: UploadCloud },
  { name: 'Leads / Entries', path: '/admin/leads', icon: FileSpreadsheet },
  { name: 'Custom Dashboards', path: '/admin/custom-dashboards', icon: PieChart },
  { name: 'Role Management', path: '/admin/roles', icon: ShieldCheck },
  { name: 'Telecaller Reports', path: '/admin/reports', icon: BarChart3 },
  { name: 'Reverted Leads', path: '/admin/reverted', icon: RotateCcw },
  { name: 'Lead Status Count', path: '/admin/status-count', icon: Layers },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 flex-shrink-0 bg-[#0e1017] border-r border-[#252840] min-h-[calc(100vh-65px)] p-4 flex flex-col justify-between">
      <div className="space-y-1.5">
        <div className="px-3 py-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#4f6ef7] text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161926]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-[#161926]/60 border border-[#252840]/60 rounded-xl mt-6 text-center">
        <p className="text-[11px] font-semibold text-slate-300">RenewCall v1.0</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Insurance Renewal CRM</p>
      </div>
    </aside>
  );
};
