
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { Menu, LogIn, ChevronDown, ListChecks, Dumbbell, ClipboardList, ArrowUpRight, ShoppingCart, BookOpen, BookMarked, Activity, FileCog, ScrollText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import TrackedLink from '@/components/TrackedLink';

interface NavItem {
  label: string;
  href?: string;
  isDropdown?: boolean;
  items?: SubNavItem[];
  icon?: React.ReactNode;
}

interface SubNavItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  isSeparator?: boolean;
}


const navItems: NavItem[] = [
  { label: 'Free Hyrox Plan', href: '/free-hyrox-plan' },
  { label: 'Our App', href: '/app' },
  {
    label: 'Guides',
    isDropdown: true,
    items: [
      { label: '2026/27 Rule Changes', href: '/hyrox-rule-changes-2026', icon: <ScrollText className="mr-2 h-5 w-5" /> },
      { label: 'How to Train for Hyrox', href: '/how-to-train-for-hyrox', icon: <BookMarked className="mr-2 h-5 w-5" /> },
      { label: '12 Week Hyrox Plan', href: '/hyrox-training-plan', icon: <ListChecks className="mr-2 h-5 w-5" /> },
      { label: 'Hybrid Training Program', href: '/hybrid-training-program', icon: <Dumbbell className="mr-2 h-5 w-5" /> },
    ]
  },
  {
    label: 'Shop',
    isDropdown: true,
    items: [
      { label: 'Books', href: '/books', icon: <BookOpen className="mr-2 h-5 w-5" /> },
      { label: 'Store', href: '/store', icon: <ShoppingCart className="mr-2 h-5 w-5" /> },
    ]
  },
  {
    label: 'Calculators',
    href: '/calculators',
    isDropdown: true,
    items: [
      { label: 'Running Calculators', href: '/calculators/running', icon: <ListChecks className="mr-2 h-5 w-5" /> },
      { label: 'VDOT Calculator', href: '/vdot', icon: <Activity className="mr-2 h-5 w-5" /> },
      { label: 'Treadmill FIT/TCX Generator', href: '/calculators/garmin-tcx-generator', icon: <FileCog className="mr-2 h-5 w-5" /> },
      { label: 'Strength Calculators', href: '/calculators/strength', icon: <Dumbbell className="mr-2 h-5 w-5" /> },
      { label: 'General Health Calculators', href: '/calculators/general-health', icon: <ClipboardList className="mr-2 h-5 w-5" /> },
    ]
  },
  { label: 'FAQ', href: '/#faq' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Image
            src="/Full Logo (2).png"
            alt="HybridX Logo"
            width={110} 
            height={40} 
            className="dark:filter dark:invert"
            priority
            style={{ objectFit: 'contain' }}
          />
        </Link>
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-3 text-sm font-medium">
          {navItems.map((item) => (
            item.isDropdown && item.items ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center transition-colors hover:bg-accent focus:bg-accent text-foreground/80 hover:text-accent-foreground focus:text-accent-foreground font-body px-2 lg:px-3 py-2 text-sm">
                    {item.icon} {item.label} <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border-border/60">
                  {item.items.map(subItem => (
                    subItem.isSeparator ? (
                      <React.Fragment key={subItem.label}>
                         {/* Separators not currently used, but logic remains if needed */}
                      </React.Fragment>
                    ) : (
                      <DropdownMenuItem key={subItem.label} asChild className="hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground">
                        <Link href={subItem.href!} className="font-body text-foreground/90 flex items-center">
                          {subItem.icon} {subItem.label}
                        </Link>
                      </DropdownMenuItem>
                    )
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button key={item.label} variant="ghost" asChild className="transition-colors hover:bg-accent focus:bg-accent text-foreground/80 hover:text-accent-foreground focus:text-accent-foreground font-body px-2 lg:px-3 py-2 text-sm group">
                <TrackedLink
                  href={item.href!}
                  {...(item.href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  event={item.href === '/app' || item.href?.startsWith('http') ? 'cta_app_click' : undefined}
                  eventParams={{ location: 'header_nav', label: item.label }}
                >
                  {item.icon} {item.label}
                  {item.href?.startsWith('http') && <ArrowUpRight className="ml-1 h-4 w-4 text-muted-foreground/80 group-hover:text-accent-foreground" />}
                </TrackedLink>
              </Button>
            )
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggleButton />
          <Button className="hidden md:inline-flex bg-accent text-accent-foreground hover:bg-accent/90 font-headline" asChild>
            <TrackedLink
              href="https://app.hybridx.club"
              target="_blank"
              rel="noopener noreferrer"
              event="cta_app_click"
              eventParams={{ location: 'header_signup' }}
            >
              <LogIn className="mr-2 h-4 w-4" /> Sign Up
            </TrackedLink>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-primary">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[320px] bg-background p-6 border-l-border/60 overflow-y-auto">
               <div className="flex justify-between items-center mb-6">
                 <Link href="/" className="flex items-center space-x-2">
                    <Image
                      src="/Full Logo (2).png" 
                      alt="HybridX Logo"
                      width={110}
                      height={40}
                      className="dark:filter dark:invert"
                       style={{ objectFit: 'contain' }}
                    />
                 </Link>
               </div>
               <SheetTitle className="sr-only">Mobile Navigation</SheetTitle>
              <nav className="flex flex-col space-y-1">
                {navItems.map((item, index) =>
                  item.isDropdown && item.items ? (
                    <React.Fragment key={`${item.label}-${index}-mobile`}>
                      <SheetClose asChild>
                        <Link
                          href={item.href || '#'}
                          className="flex items-center justify-between rounded-md px-3 py-3 transition-colors hover:bg-accent/10 text-lg font-headline text-primary group"
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                      {item.items.map(subItem => (
                        subItem.isSeparator ? (
                           null // Separators not currently used
                        ) : (
                          <SheetClose asChild key={`${subItem.label}-mobile`}>
                            <Link
                              href={subItem.href!}
                              className="flex items-center rounded-md px-3 py-3 transition-colors hover:bg-accent/10 text-base font-body text-foreground/90 ml-3"
                            >
                              {subItem.icon} {subItem.label}
                            </Link>
                          </SheetClose>
                        )
                      ))}
                    </React.Fragment>
                  ) : (
                    <SheetClose asChild key={`${item.label}-mobile`}>
                      <TrackedLink
                        href={item.href!}
                        {...(item.href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        event={item.href === '/app' || item.href?.startsWith('http') ? 'cta_app_click' : undefined}
                        eventParams={{ location: 'header_nav_mobile', label: item.label }}
                        className="flex items-center justify-between rounded-md px-3 py-3 transition-colors hover:bg-accent/10 text-base font-headline text-foreground/90 group"
                      >
                        <span className="flex items-center">
                          {item.icon} {item.label}
                        </span>
                        {item.href?.startsWith('http') && <ArrowUpRight className="h-5 w-5 text-muted-foreground/60 group-hover:text-accent" />}
                      </TrackedLink>
                    </SheetClose>
                  )
                )}
                <div className="mt-6 pt-4 border-t border-border/40 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Theme</span>
                    <ThemeToggleButton />
                </div>
                <SheetClose asChild>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90 mt-4 py-3 text-base font-headline w-full" asChild>
                    <TrackedLink
                      href="https://app.hybridx.club"
                      target="_blank"
                      rel="noopener noreferrer"
                      event="cta_app_click"
                      eventParams={{ location: 'header_signup_mobile' }}
                    >
                       <LogIn className="mr-2 h-5 w-5" /> Sign Up
                    </TrackedLink>
                  </Button>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
