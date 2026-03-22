import * as React from 'react';
import { Dialog as D } from 'radix-ui';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const Dialog = D.Root;

const DialogTrigger = D.Trigger;

const DialogPortal = D.Portal;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <D.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <D.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-2xl',
          className,
        )}
        {...props}
      >
        {children}
        <D.Close
          type='button'
          className='absolute right-4 top-4 rounded-md p-1 text-gray-500 opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:ring-offset-2'
          aria-label='Tutup'
        >
          <X className='h-4 w-4' />
        </D.Close>
      </D.Content>
    </DialogPortal>
  ),
);
DialogContent.displayName = 'DialogContent';

function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex flex-col space-y-1.5 text-center sm:text-left',
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <D.Title
      className={cn('text-lg font-semibold leading-none text-gray-900', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <D.Description
      className={cn('text-sm text-gray-600', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
};
