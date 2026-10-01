import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PhotoUploadFieldProps {
    currentUrl?: string | null;
    file: File | null;
    onFileChange: (file: File | null) => void;
    removeCurrent?: boolean;
    onRemoveCurrentChange?: (value: boolean) => void;
    error?: string;
    /** Value for the file input's accept attribute. */
    accept?: string;
    /** Allowed MIME types, checked in the browser before uploading. */
    allowedTypes?: string[];
    /** Maximum size in megabytes, checked in the browser before uploading. */
    maxSizeMb?: number;
    hint?: string;
}

export function PhotoUploadField({
    currentUrl,
    file,
    onFileChange,
    removeCurrent,
    onRemoveCurrentChange,
    error,
    accept = 'image/*',
    allowedTypes,
    maxSizeMb,
    hint = 'JPG, PNG o WEBP. Máx. 2MB.',
}: PhotoUploadFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const showCurrent = !file && !removeCurrent && currentUrl;
    const displayUrl = previewUrl ?? (showCurrent ? currentUrl : null);

    const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] ?? null;
        e.target.value = '';

        if (!selected) return;

        // Reject invalid files up front so the user doesn't wait for an upload that will fail.
        if (allowedTypes && !allowedTypes.includes(selected.type)) {
            setLocalError('Formato no permitido. ' + hint);
            return;
        }

        if (maxSizeMb && selected.size > maxSizeMb * 1024 * 1024) {
            setLocalError(`La foto pesa ${(selected.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${maxSizeMb} MB.`);
            return;
        }

        setLocalError(null);
        onFileChange(selected);
        onRemoveCurrentChange?.(false);
    };

    const handleClear = () => {
        setLocalError(null);

        if (file) {
            // Cancel the newly selected file; revert to showing the current photo, if any.
            onFileChange(null);
            return;
        }

        if (currentUrl) {
            onRemoveCurrentChange?.(true);
        }
    };

    const message = localError ?? error;

    return (
        <div className="space-y-2">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative shrink-0">
                    <Avatar className="border-background size-20 border-4 shadow-sm">
                        {displayUrl && <AvatarImage src={displayUrl} alt="Foto" className="object-cover" />}
                        <AvatarFallback>
                            <UserRound className="text-muted-foreground size-8" />
                        </AvatarFallback>
                    </Avatar>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="border-background bg-primary text-primary-foreground absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border-2 shadow-sm transition hover:opacity-90"
                    >
                        <Camera className="size-3.5" />
                        <span className="sr-only">{displayUrl ? 'Cambiar foto' : 'Subir foto'}</span>
                    </button>
                    <Label htmlFor="foto" className="sr-only">
                        Foto
                    </Label>
                    <input ref={inputRef} id="foto" type="file" accept={accept} className="hidden" onChange={handleSelect} />
                </div>

                <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
                    <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                        <Camera className="size-4" />
                        {displayUrl ? 'Cambiar foto' : 'Subir foto'}
                    </Button>
                    <p className="text-muted-foreground text-xs">{hint}</p>
                    {displayUrl && (
                        <Button type="button" variant="link" size="sm" className="text-destructive h-auto p-0 text-xs" onClick={handleClear}>
                            <X className="size-3" />
                            Quitar foto
                        </Button>
                    )}
                </div>
            </div>
            {message && <p className="text-destructive text-sm">{message}</p>}
        </div>
    );
}
