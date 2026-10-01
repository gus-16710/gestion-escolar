<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Shared photo upload handling for records with a nullable `foto` column on the `public` disk
 * (Alumno, Profesor): JPG/JPEG up to 1.5 MB, replaceable and removable from the edit form.
 */
trait ManagesPhotos
{
    /**
     * @return array<string, mixed>
     */
    protected function photoRules(): array
    {
        return [
            'foto' => ['nullable', 'image', 'mimes:jpg,jpeg', 'max:1536'],
            'remove_foto' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function photoMessages(): array
    {
        return [
            'foto.image' => 'La foto debe ser una imagen.',
            'foto.mimes' => 'La foto debe estar en formato JPG o JPEG.',
            'foto.max' => 'La foto no puede pesar más de 1.5 MB.',
            'foto.uploaded' => 'No se pudo subir la foto; revisa que no pese más de 1.5 MB.',
        ];
    }

    /**
     * Store a newly uploaded photo, or clear it when the form asked to remove it. Does not save the model.
     */
    protected function applyPhoto(Request $request, Model $persona, string $directorio): void
    {
        if ($request->hasFile('foto')) {
            $persona->foto = $request->file('foto')->store($directorio, 'public');
        } elseif ($request->boolean('remove_foto')) {
            $persona->foto = null;
        }
    }

    /**
     * Delete the previous file once the model no longer points to it. Call after the save is committed.
     */
    protected function deleteReplacedPhoto(?string $fotoAnterior, Model $persona): void
    {
        if ($fotoAnterior && $fotoAnterior !== $persona->foto) {
            Storage::disk('public')->delete($fotoAnterior);
        }
    }
}
