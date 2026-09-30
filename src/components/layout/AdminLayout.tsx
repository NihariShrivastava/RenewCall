import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ChangePasswordModal } from '../common/ChangePasswordModal';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0e1017] text-slate-100 flex flex-col font-sans">
      <Header />
      <div className="flex-1 flex w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 bg-[#0e1017] p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <ChangePasswordModal />
    </div>
  );
};
