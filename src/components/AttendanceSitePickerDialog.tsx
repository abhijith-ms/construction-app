import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Tables } from "@/types/database";

type Site = Tables<"sites">;

interface AttendanceSitePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sites: Site[];
  onSelect: (siteId: string) => void;
}

export function AttendanceSitePickerDialog({
  open,
  onOpenChange,
  sites,
  onSelect,
}: AttendanceSitePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Select a site</DialogTitle>
          <DialogDescription>
            Choose which site's attendance you want to mark.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {sites.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => onSelect(site.id)}
              className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              {site.name}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
