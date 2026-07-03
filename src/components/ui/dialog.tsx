import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    {/* Use inset-0 + flex centering instead of translate (Tailwind v4 compat) */}
    {/* Phones: bottom-sheet style (full width, flush bottom, rounded top). */}
    <div className="fixed inset-0 z-50 flex items-end justify-center pt-12 sm:items-start sm:px-4 sm:py-12">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "relative flex max-h-[calc(100dvh-3rem)] w-full max-w-md flex-col overflow-y-auto rounded-t-xl border border-border-default bg-bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl focus:outline-none sm:max-h-[calc(100vh-6rem)] sm:rounded-xl sm:pb-6",
          className,
        )}
        // Radix Select/Popover content portals to <body>, outside this dialog's
        // DOM. Without this guard, interacting with an open select (e.g.
        // clicking its trigger a second time) counts as an "outside" pointer
        // event and closes the whole dialog.
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper]")) {
            event.preventDefault();
          }
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-fg-muted opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </div>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-fg-default", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-fg-muted", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
