'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/new', label: 'New Run' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="bg-surface border-b border-border sticky top-0 z-50">
      <div className="flex items-center h-[60px] px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 mr-6 sm:mr-10 no-underline shrink-0">
          <div className="w-[30px] h-[30px] bg-primary rounded-md flex items-center justify-center text-white font-bold text-[13px]">
            QA
          </div>
          <span className="font-semibold text-[15px] text-text hidden sm:inline">QA Intelligence</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex gap-1 flex-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium no-underline transition-colors ${
                pathname === link.href
                  ? 'bg-primary-light text-primary'
                  : 'text-text-sec hover:bg-surface-alt hover:text-text'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex-1 sm:hidden" />

        <div className="flex gap-2 sm:gap-2.5 items-center">
          <ThemeToggle />
          <Link
            href="/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium no-underline hover:bg-primary-dark transition-colors"
          >
            + New QA Run
          </Link>
          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg text-text-sec hover:bg-surface-alt cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              {menuOpen ? (
                <path d="M5 5l10 10M15 5l-10 10" />
              ) : (
                <path d="M3 5h14M3 10h14M3 15h14" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-border px-4 py-3 flex flex-col gap-1 bg-surface">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`px-3.5 py-2 rounded-lg text-[13px] font-medium no-underline transition-colors ${
                pathname === link.href
                  ? 'bg-primary-light text-primary'
                  : 'text-text-sec hover:bg-surface-alt hover:text-text'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/new"
            onClick={() => setMenuOpen(false)}
            className="mt-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium no-underline hover:bg-primary-dark"
          >
            + New QA Run
          </Link>
        </div>
      )}
    </nav>
  );
}
