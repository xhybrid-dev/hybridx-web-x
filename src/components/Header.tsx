import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { Menu, ChevronDown, ArrowRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import TrackedLink from '@/components/TrackedLink';
import { APP_LOGIN_URL, APP_SIGNUP_URL } from '@/lib/app-links';
import { primaryNav } from '@/lib/site-nav';

const triggerClass =
  'flex items-center transition-colors hover:bg-accent focus:bg-accent text-foreground/80 hover:text-accent-foreground focus:text-accent-foreground font-body px-2 lg:px-3 py-2 text-sm';

export default function Header() {
  const navItems = primaryNav();

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
        <nav aria-label="Primary" className="hidden md:flex items-center space-x-1 lg:space-x-2 text-sm font-medium">
          {navItems.map((item) =>
            item.kind === 'group' ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={triggerClass}>
                    {item.label} <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border-border/60">
                  {item.links.map((link) => (
                    <DropdownMenuItem
                      key={link.href}
                      asChild
                      className="hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground"
                    >
                      <Link href={link.href} className="font-body text-foreground/90 flex items-center">
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                key={item.label}
                variant="ghost"
                asChild
                className="transition-colors hover:bg-accent focus:bg-accent text-foreground/80 hover:text-accent-foreground focus:text-accent-foreground font-body px-2 lg:px-3 py-2 text-sm"
              >
                <TrackedLink
                  href={item.href}
                  event={item.href === '/app' ? 'cta_app_click' : undefined}
                  eventParams={{ location: 'header_nav', label: item.label }}
                >
                  {item.label}
                </TrackedLink>
              </Button>
            ),
          )}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggleButton />
          {/* A member's way back in. The app is a separate site, so this is a plain link:
              a sign-in credits no page, and carries no src. */}
          <Button
            variant="ghost"
            asChild
            className="hidden md:inline-flex text-foreground/80 hover:bg-accent hover:text-accent-foreground font-body"
          >
            <a href={APP_LOGIN_URL}>Log In</a>
          </Button>
          <Button className="hidden md:inline-flex bg-accent text-accent-foreground hover:bg-accent/90 font-headline" asChild>
            <TrackedLink
              href={APP_SIGNUP_URL}
              event="cta_app_click"
              eventParams={{ location: 'header_signup' }}
            >
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
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
              <nav aria-label="Mobile" className="flex flex-col space-y-1">
                {navItems.map((item) =>
                  item.kind === 'group' ? (
                    <React.Fragment key={`${item.label}-mobile`}>
                      {/* A heading, not a link: it used to be href="#", which closed the drawer and jumped to the top. */}
                      <p className="px-3 pt-4 pb-1 font-headline text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {item.label}
                      </p>
                      {item.links.map((link) => (
                        <SheetClose asChild key={`${item.label}-${link.href}-mobile`}>
                          <Link
                            href={link.href}
                            className="flex items-center rounded-md px-3 py-2.5 transition-colors hover:bg-accent/10 text-base font-body text-foreground/90"
                          >
                            {link.label}
                          </Link>
                        </SheetClose>
                      ))}
                    </React.Fragment>
                  ) : (
                    <SheetClose asChild key={`${item.label}-mobile`}>
                      <TrackedLink
                        href={item.href}
                        event={item.href === '/app' ? 'cta_app_click' : undefined}
                        eventParams={{ location: 'header_nav_mobile', label: item.label }}
                        className="flex items-center rounded-md px-3 py-3 mt-2 transition-colors hover:bg-accent/10 text-lg font-headline text-primary"
                      >
                        {item.label}
                      </TrackedLink>
                    </SheetClose>
                  ),
                )}
                <div className="mt-6 pt-4 border-t border-border/40 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggleButton />
                </div>
                <SheetClose asChild>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90 mt-4 py-3 text-base font-headline w-full" asChild>
                    <TrackedLink
                      href={APP_SIGNUP_URL}
                      event="cta_app_click"
                      eventParams={{ location: 'header_signup_mobile' }}
                    >
                      Start Free Trial <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                    </TrackedLink>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button variant="outline" className="mt-2 py-3 text-base font-headline w-full" asChild>
                    <a href={APP_LOGIN_URL}>Member Log In</a>
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
