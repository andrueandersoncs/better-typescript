import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "app/lib/utils";
import * as React from "react";

export const Avatar = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) => (
  <AvatarPrimitive.Root
    data-slot="avatar"
    className={cn("circle relative flex size-8 shrink-0 overflow-hidden", className)}
    {...props}
  />
);

export const AvatarImage = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) => (
  <AvatarPrimitive.Image data-slot="avatar-image" className={cn("aspect-square size-full", className)} {...props} />
);

export const AvatarFallback = ({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => (
  <AvatarPrimitive.Fallback
    data-slot="avatar-fallback"
    className={cn("circle bg-muted flex size-full items-center justify-center", className)}
    {...props}
  />
);
