import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getAllLeadsRaw } from '../../lib/db';
import { Lead } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatDate, getDaysDifference, toISODateString } from '../../lib/utils';
import { TelecallerLeadModal } from '../../components/telecaller/TelecallerLeadModal';
import { Header } from '../../components/layout/Header';
import { 
  Phone, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  FastForward, 
  ChevronRight,
  Sparkles,
  Car
} from 'lucide-react';

type SlideTab = 'reminder' | 'done' | 'closed' | 'reverted';

export const TelecallerRoster: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SlideTab>('reminder');
  const [allMyLeads, setAllMyLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters for Slides 2, 3, 4
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Active Lead for Detail Modal
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Touch Swipe detection
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    loadMyLeads();
  }, [user]);

  const loadMyLeads = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const all = await getAllLeadsRaw();
      // Telecaller ONLY sees their assigned leads, OR leads reverted by them (activity check or previous assigned)
      const myLeads = all.filter(l => l.assigned_to === user.id || (l.status === 'reverted' && l.last_remark));
      setAllMyLeads(myLeads);
    } catch (e) {
      console.error('Failed to load telecaller roster:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const todayStr = toISODateString(new Date());

  // Split into the 4 Slides
  const slide1Reminders = useMemo(() => {
    return allMyLeads
      .filter(l => l.status === 'pending' && l.next_call_date && l.next_call_date <= todayStr)
      .sort((a, b) => (a.policy_date || '').localeCompare(b.policy_date || ''));
  }, [allMyLeads, todayStr]);

  const slide2Done = useMemo(() => {
    return allMyLeads.filter(l => l.status === 'done');
  }, [allMyLeads]);

  const slide3Closed = useMemo(() => {
    return allMyLeads.filter(l => l.status === 'closed');
  }, [allMyLeads]);

  const slide4Reverted = useMemo(() => {
    return allMyLeads.filter(l => l.status === 'reverted');
  }, [allMyLeads]);

  // Apply search/date filter on slides 2, 3, 4
  const filterList = (list: Lead[]) => {
    return list.filter(l => {
      if (search) {
        const q = search.toLowerCase();
        const inName = l.customer_name.toLowerCase().includes(q);
        const inPhone = l.phone.includes(q);
        const inRemark = l.last_remark && l.last_remark.toLowerCase().includes(q);
        if (!inName && !inPhone && !inRemark) return false;
      }
      if (dateFilter && l.policy_date !== dateFilter) {
        return false;
      }
      return true;
    });
  };

  // Touch Swipe handlers for horizontal mobile carousel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const tabs: SlideTab[] = ['reminder', 'done', 'closed', 'reverted'];
    const currentIndex = tabs.indexOf(activeTab);

    if (diff > 60 && currentIndex < tabs.length - 1) {
      // Swipe left -> Next tab
      setActiveTab(tabs[currentIndex + 1]);
    } else if (diff < -60 && currentIndex > 0) {
      // Swipe right -> Prev tab
      setActiveTab(tabs[currentIndex - 1]);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className="min-h-screen bg-[#0e1017] text-slate-100 flex flex-col font-sans">
      <Header onRefresh={loadMyLeads} />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Telecaller Welcome Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Today's Calling Roster
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Welcome, <span className="text-white font-semibold">{user?.full_name}</span> &bull; {slide1Reminders.length} reminder calls due today
            </p>
          </div>
        </div>

        {/* 4-Tab Carousel Bar with Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#161926] p-1.5 rounded-2xl border border-[#252840]">
          <button
            onClick={() => setActiveTab('reminder')}
            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'reminder'
                ? 'bg-[#4f6ef7] text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-[#1f2338]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Due Today</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/25 font-mono">
              {slide1Reminders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('done')}
            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'done'
                ? 'bg-[#22c55e] text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-[#1f2338]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/25 font-mono">
              {slide2Done.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('closed')}
            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'closed'
                ? 'bg-[#ef4444] text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-white hover:bg-[#1f2338]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <XCircle className="w-3.5 h-3.5" />
              <span>Closed</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/25 font-mono">
              {slide3Closed.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reverted')}
            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'reverted'
                ? 'bg-[#8b5cf6] text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-[#1f2338]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reverted</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/25 font-mono">
              {slide4Reverted.length}
            </span>
          </button>
        </div>

        {/* Filter bar for Slides 2, 3, 4 */}
        {activeTab !== 'reminder' && (
          <div className="bg-[#161926] border border-[#252840] rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 animate-in fade-in">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone or remarks..."
                className="w-full pl-9 pr-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4f6ef7]"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-[#0e1017] border border-[#252840] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[#4f6ef7]"
            />
          </div>
        )}

        {/* Slide Carousel Container with Swipe Support */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="space-y-3.5 min-h-[500px]"
        >
          {/* SLIDE 1: DUE TODAY REMINDER CALLS */}
          {activeTab === 'reminder' && (
            <div className="space-y-3 animate-in fade-in">
              {slide1Reminders.length === 0 ? (
                <div className="bg-[#161926] border border-[#252840] rounded-3xl p-10 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-white">All Caught Up for Today!</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    You have completed all reminder calls scheduled for today. Future follow-ups will automatically appear here when their reminder dates arrive.
                  </p>
                </div>
              ) : (
                slide1Reminders.map(lead => {
                  const daysLeft = getDaysDifference(lead.policy_date);
                  const isOverdue = daysLeft < 0;

                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`p-5 rounded-2xl bg-[#161926] border transition-all cursor-pointer relative shadow-md hover:scale-[1.01] ${
                        isOverdue
                          ? 'border-rose-500/50 bg-rose-500/5 hover:border-rose-400'
                          : 'border-[#252840] hover:border-[#4f6ef7]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 pr-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base font-bold text-white truncate">
                              {lead.customer_name}
                            </h3>
                            {isOverdue && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                OVERDUE
                              </span>
                            )}
                            {lead.skip_count > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                                <FastForward className="w-3 h-3" />
                                <span>Skip #{lead.skip_count}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>Policy Expiry: {formatDate(lead.policy_date)}</span>
                            </span>
                            <span>•</span>
                            <span className={`font-semibold ${isOverdue ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                            </span>
                          </p>

                          {/* Insurance & Vehicle Metadata */}
                          {(lead.data?.['Product'] || lead.data?.['Vehicle Brand'] || lead.data?.['Vehicle No']) && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 font-medium pt-0.5">
                              {(lead.data?.['Product'] || lead.data?.['Vehicle Brand']) && (
                                <span className="px-2 py-0.5 rounded-lg bg-[#0e1017] border border-[#252840] text-slate-200">
                                  {lead.data?.['Product'] || lead.data?.['Vehicle Brand']} {lead.data?.['Sub Product'] ? `(${lead.data['Sub Product']})` : ''}
                                </span>
                              )}
                              {lead.data?.['Vehicle No'] && (
                                <span className="px-2 py-0.5 rounded-lg bg-[#0e1017] border border-[#252840] font-mono text-slate-300">
                                  {lead.data['Vehicle No']}
                                </span>
                              )}
                              {(lead.data?.['RTO Place'] || lead.data?.['RTO State']) && (
                                <span className="text-slate-400 text-[11px]">
                                  📍 {[lead.data['RTO Place'], lead.data['RTO State']].filter(Boolean).join(', ')}
                                </span>
                              )}
                              {(lead.data?.['Insu.Company'] || lead.data?.['Insurer']) && (
                                <span className="text-[#4f6ef7] text-[11px] font-semibold">
                                  {lead.data['Insu.Company'] || lead.data['Insurer']}
                                </span>
                              )}
                              {lead.data?.['Employee'] && (
                                <span className="text-slate-400 text-[11px]">
                                  Agent: {lead.data['Employee']}
                                </span>
                              )}
                            </div>
                          )}

                          {lead.last_remark && (
                            <p className="text-xs text-slate-400 italic pt-1 truncate">
                              Last remark: "{lead.last_remark}"
                            </p>
                          )}
                        </div>

                        {/* Direct Tap-to-Call Large Target (Mobile First) */}
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-tr from-[#4f6ef7] to-[#8b5cf6] text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-600/30 active:scale-95 transition-transform"
                          title="Dial Call"
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SLIDE 2: INSURANCE DONE */}
          {activeTab === 'done' && (
            <div className="space-y-3 animate-in fade-in">
              {filterList(slide2Done).length === 0 ? (
                <div className="bg-[#161926] border border-[#252840] rounded-3xl p-10 text-center text-slate-400 text-xs">
                  No leads marked done matching your search.
                </div>
              ) : (
                filterList(slide2Done).map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="p-4 rounded-2xl bg-[#161926] border border-emerald-500/20 hover:border-emerald-500/50 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-white">{lead.customer_name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Renewed
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">{lead.phone}</p>
                      {lead.last_remark && (
                        <p className="text-xs text-slate-300 italic mt-0.5">"{lead.last_remark}"</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))
              )}
            </div>
          )}

          {/* SLIDE 3: CLOSED */}
          {activeTab === 'closed' && (
            <div className="space-y-3 animate-in fade-in">
              {filterList(slide3Closed).length === 0 ? (
                <div className="bg-[#161926] border border-[#252840] rounded-3xl p-10 text-center text-slate-400 text-xs">
                  No closed leads matching your search.
                </div>
              ) : (
                filterList(slide3Closed).map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="p-4 rounded-2xl bg-[#161926] border border-rose-500/20 hover:border-rose-500/50 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-white">{lead.customer_name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Closed
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">{lead.phone}</p>
                      {lead.last_remark && (
                        <p className="text-xs text-rose-300 italic mt-0.5">Reason: "{lead.last_remark}"</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))
              )}
            </div>
          )}

          {/* SLIDE 4: REVERTED TO ADMIN */}
          {activeTab === 'reverted' && (
            <div className="space-y-3 animate-in fade-in">
              {filterList(slide4Reverted).length === 0 ? (
                <div className="bg-[#161926] border border-[#252840] rounded-3xl p-10 text-center text-slate-400 text-xs">
                  No reverted leads matching your search.
                </div>
              ) : (
                filterList(slide4Reverted).map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="p-4 rounded-2xl bg-[#161926] border border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-white">{lead.customer_name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          Reverted
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">{lead.phone}</p>
                      {lead.last_remark && (
                        <p className="text-xs text-purple-300 italic mt-0.5">Note: "{lead.last_remark}"</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* Telecaller Lead Detail & Action Modal */}
      <TelecallerLeadModal
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onActionComplete={loadMyLeads}
      />
    </div>
  );
};
