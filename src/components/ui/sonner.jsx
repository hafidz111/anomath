/**
 * Toast / snackbar — pola resmi shadcn/ui (paket `sonner`).
 * @see https://ui.shadcn.com/docs/components/sonner
 */
import { Toaster as Sonner } from 'sonner';

import { cn } from '@/lib/utils';

export function Toaster({ className, ...props }) {
  return (
    <Sonner
      className={cn('toaster group', className)}
      position='top-center'
      richColors
      duration={2000}
      toastOptions={{
        classNames: {
          toast: cn(
            'group toast group-[.toaster]:border-border group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:shadow-lg',
          ),
          description: 'group-[.toaster]:text-muted-foreground',
          actionButton:
            'group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground',
          cancelButton:
            'group-[.toaster]:bg-muted group-[.toaster]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}
