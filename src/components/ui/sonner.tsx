import { Toaster as Sonner } from "sonner";

import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  /* Corner toasts sit on top of the phone header, over the sync state and the
     account button. They drop to the centre under it instead. Resolved after
     mount so the server and the first client render agree. */
  const isMobile = useIsMobile();

  return (
    <Sonner
      className="toaster group"
      position={isMobile ? "top-center" : "top-right"}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
