import { ImageUp } from "lucide-react";
import { useId } from "react";

import { useObjectUrl } from "~/hooks/use-object-url";

type ThumbnailPickerProps = {
  currentUrl: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  eventName: string;
};

/** Picks an image but holds it until the form is saved (HLD 3.3). */
export function ThumbnailPicker({
  currentUrl,
  file,
  onFileChange,
  eventName,
}: ThumbnailPickerProps) {
  const id = useId();
  const shownUrl = useObjectUrl(file) ?? currentUrl;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-neutral-foreground"
      >
        Thumbnail
      </label>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-banner-from to-banner-to">
          {shownUrl ? (
            <img
              src={shownUrl}
              alt={`${eventName || "Event"} thumbnail`}
              className="size-full object-cover"
            />
          ) : (
            <ImageUp
              aria-hidden="true"
              className="size-6 text-accent-foreground"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <input
            id={id}
            type="file"
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            className="max-w-full text-[13px] text-neutral-foreground file:mr-3 file:h-9 file:rounded-[10px] file:border file:border-input file:bg-background file:px-3 file:text-[13px] file:font-semibold file:text-foreground"
          />
          <span className="text-xs text-muted-foreground">
            {file
              ? "Uploads when you save."
              : "PNG or JPG, shown on the membership portal."}
          </span>
        </div>
      </div>
    </div>
  );
}
