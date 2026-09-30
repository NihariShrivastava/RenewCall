import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  iconColor?: 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'emerald';
  trend?: string;
}

const COLOR_MAP = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-[#4f6ef7]',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-[#8b5cf6]',
  },
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-[#22c55e]',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
  },
  yellow: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-[#eab308]',
  },
  red: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-[#ef4444]',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor = 'blue',
  trend,
}) => {
  const colors = COLOR_MAP[iconColor] || COLOR_MAP.blue;

  return (
    <div className="bg-[#161926] border border-[#252840] rounded-2xl p-5 hover:border-[#393e60] transition-all flex items-center space-x-4 shadow-sm">
      <div className={`w-13 h-13 p-3.5 rounded-xl ${colors.bg} border ${colors.border} ${colors.text} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
          {label}
        </p>
        <div className="flex items-baseline space-x-2 mt-1">
          <h4 className="text-2xl font-black text-white tracking-tight">{value}</h4>
          {trend && (
            <span className="text-[11px] font-medium text-emerald-400">{trend}</span>
          )}
        </div>
        {subValue && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{subValue}</p>
        )}
      </div>
    </div>
  );
};
