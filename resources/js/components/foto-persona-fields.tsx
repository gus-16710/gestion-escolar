import { PhotoUploadField } from '@/components/photo-upload-field';
import { Separator } from '@/components/ui/separator';

/** Form fields every person form with a photo shares (see the ManagesPhotos trait on the backend). */
export type FotoData = {
    foto: File | null;
    remove_foto: boolean;
};

export const emptyFoto: FotoData = { foto: null, remove_foto: false };

// Generic over the full form type so each form can pass its own useForm setData.
interface FotoPersonaFieldsProps<T extends FotoData> {
    /** Current photo; only when editing. */
    fotoUrl?: string | null;
    data: T;
    setData: <K extends keyof T>(key: K, value: T[K]) => void;
    errors: Partial<Record<keyof T, string>>;
    /** False when the surrounding form section already names it. */
    conTitulo?: boolean;
}

/** Photo section of the alumno and profesor forms: JPG/JPEG up to 1.5 MB, matching the backend rules. */
export function FotoPersonaFields<T extends FotoData>({ fotoUrl, data, setData, errors, conTitulo = true }: FotoPersonaFieldsProps<T>) {
    return (
        <div className="space-y-4">
            {conTitulo && (
                <>
                    <h3 className="text-sm font-medium">Foto</h3>
                    <Separator />
                </>
            )}
            <PhotoUploadField
                currentUrl={fotoUrl}
                file={data.foto}
                onFileChange={(file) => setData('foto', file as T['foto'])}
                removeCurrent={data.remove_foto}
                onRemoveCurrentChange={(value) => setData('remove_foto', value as T['remove_foto'])}
                error={errors.foto}
                accept=".jpg,.jpeg,image/jpeg"
                allowedTypes={['image/jpeg']}
                maxSizeMb={1.5}
                hint="JPG o JPEG. Máx. 1.5 MB."
            />
        </div>
    );
}
