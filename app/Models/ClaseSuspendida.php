<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A class of a grupo that was not given. With fecha_reposicion it was made up on that date and nothing
 * shifts; without it the class was lost and the grupo's study plan moves (see App\Support\CalendarioGrupo).
 */
class ClaseSuspendida extends Model
{
    protected $table = 'clases_suspendidas';

    public const MOTIVOS = [
        'profesor' => 'Falta del profesor',
        'salud' => 'Salud',
        'evento' => 'Evento',
        'otro' => 'Otro motivo',
    ];

    protected $fillable = [
        'grupo_id',
        'fecha',
        'motivo',
        'observaciones',
        'fecha_reposicion',
        'registrado_por',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
            'fecha_reposicion' => 'date',
        ];
    }

    public function etiquetaMotivo(): string
    {
        return self::MOTIVOS[$this->motivo] ?? $this->motivo;
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }
}
