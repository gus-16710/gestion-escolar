<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One module of a curso's study plan. Every grupo of the curso goes through its modules in `orden`,
 * each lasting `duracion_semanas` of classes from the grupo's start (see App\Support\CalendarioGrupo::modulos()).
 */
class CursoModulo extends Model
{
    protected $table = 'curso_modulos';

    protected $fillable = [
        'curso_id',
        'orden',
        'nombre',
        'descripcion',
        'duracion_semanas',
    ];

    protected function casts(): array
    {
        return [
            'orden' => 'integer',
            'duracion_semanas' => 'integer',
        ];
    }

    public function calificaciones(): HasMany
    {
        return $this->hasMany(Calificacion::class);
    }

    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class);
    }
}
