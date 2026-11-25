'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/button';

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  // Ensure the component only renders on the client-side after theme is initialized
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render a placeholder or null on the server/initial client render
    // to avoid flash of incorrect icon or hydration mismatch.
    // A button-sized skeleton could be used for better UX.
    return <div className="h-10 w-10" />; // Placeholder to maintain layout
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="text-primary hover:text-accent-foreground"
    >
      {theme === 'dark' ? (
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
      )}
    </Button>
  );
}
