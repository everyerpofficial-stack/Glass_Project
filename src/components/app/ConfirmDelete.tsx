/* Confirmation gate for destructive actions.

   Every delete in this app removes the record from localStorage *and* from the
   Google Sheet, with no undo and no trash. They were all wired straight to a
   trash icon's onClick, so a single mis-tap on a phone permanently destroyed an
   invoice, a customer or a payment. */
import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmDelete({
  onConfirm,
  title = "Delete this record?",
  description,
  confirmLabel = "Delete",
  children,
}: {
  onConfirm: () => void;
  title?: string;
  description: ReactNode;
  confirmLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
