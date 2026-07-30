import { useRef } from "react"
import { ImageUp } from "lucide-react"

interface EventThumbnailProps {
    thumbnail: string | null;
    eventName: string;
    isEditing: boolean;
    onFileSelected: (file: File, previewUrl: string) => void;
}

export function EventThumbnail({ thumbnail, eventName, isEditing, onFileSelected }: EventThumbnailProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        onFileSelected(file, previewUrl);
    };

    const fileInput = (
        <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSelect}
        />
    );

    const uploadOverlayContent = (
        <>
            <ImageUp className="h-8 w-8" />
            <span className="text-sm font-medium">
                {thumbnail ? "Change Thumbnail" : "Upload Thumbnail"}
            </span>
        </>
    );

    if (thumbnail) {
        return (
            <div className="px-6 pb-2 flex justify-center">
                <div className="relative w-full max-w-md group">
                    <img
                        src={thumbnail}
                        alt={`${eventName} thumbnail`}
                        className="w-full rounded-lg object-contain"
                    />
                    {isEditing && (
                        <>
                            {fileInput}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/50 text-white opacity-0 transition-opacity hover:opacity-100 cursor-pointer"
                            >
                                {uploadOverlayContent}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className="px-6 pb-2 flex justify-center">
                {fileInput}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 w-full max-w-md h-48 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                >
                    {uploadOverlayContent}
                </button>
            </div>
        );
    }

    return null;
}
