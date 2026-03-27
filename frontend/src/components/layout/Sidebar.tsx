'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, FolderOpen, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function Sidebar({
  userEmail,
  userName,
  avatarUrl,
}: {
  userEmail: string;
  userName: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/app' },
    { name: 'My Documents', icon: FolderOpen, href: '/app/documents' },
    { name: 'Drafts', icon: FileText, href: '/app/drafts' },
    { name: 'Settings', icon: Settings, href: '/app/settings' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 w-[220px] bg-white border-r border-[#E8DFD8] flex-col z-30 font-body hidden md:flex">
      <div className="h-[72px] flex items-center px-5">
        <Link href="/app" className="flex items-center space-x-2 text-[#211615]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#E53935" />
          </svg>
          <span className="font-semibold text-[15px]">Coldstart</span>
        </Link>
      </div>

      <nav className="flex-1 mt-3 px-3 flex flex-col gap-1.5">
        {navItems.map((item) => {
          const isActive = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 h-10 px-3 rounded-xl text-[14px] font-medium transition-colors cursor-pointer select-none
                ${isActive 
                  ? 'bg-[#FDECEC] text-[#E53935]' 
                  : 'text-[#725F57] hover:text-[#2D221F] hover:bg-[#F8F2EE]'}
              `}
            >
              <item.icon size={16} className={`${isActive ? 'text-[#E53935]' : 'text-[#9B857C]'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#EFE5DE] flex items-center mt-auto gap-2.5">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={userName} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#F3D1D0] flex items-center justify-center text-[#9D2220] font-semibold text-[13px]">
            {initials || 'U'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-[#412E29] font-medium truncate">{userName}</p>
          <p className="text-[11px] text-[#8D7770] truncate">{userEmail || 'user@email.com'}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="text-[#8D7770] hover:text-[#E53935] transition-colors ml-auto"
          aria-label="Logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
