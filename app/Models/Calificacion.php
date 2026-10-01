<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The grade of one enrollment in one module of the study plan (0–10, one decimal). A retake
 * (`recuperacion`, only for a failed module) is the grade that counts; the original stays as history.
 */
class Calificacion extends Model
{
    protected $table = 'calificaciones';

    /** Lowest passing grade. */
    public const APROBATORIA = 6;

    protected $fillable = [
        'inscripcion_id',
        'curso_modulo_id',
        'calificacion',
        'fecha_evaluacion',
        'recuperacion',
        'fecha_recuperacion',
        'observaciones',
        'registrado_por',
    ];

    protected function casts(): array
    {
        return [
            'calificacion' => 'float',
            'recuperacion' => 'float',
            'fecha_evaluacion' => 'date',
            'fecha_recuperacion' => 'date',
        ];
    }

    /**
     * The grade that counts: the retake when there is one, otherwise the original.
     */
    public function final(): float
    {
        return $this->recuperacion ?? $this->calificacion;
    }

    public function aprobada(): bool
    {
        return $this->final() >= self::APROBATORIA;
    }

    public function inscripcion(): BelongsTo
    {
        return $this->belongsTo(Inscripcion::class);
    }

    public function modulo(): BelongsTo
    {
        return $this->belongsTo(CursoModulo::class, 'curso_modulo_id');
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }
}
