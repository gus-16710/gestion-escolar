<?php

namespace App\Models;

use App\Support\Dashboard\ResumenEscolar;
use Database\Factories\InscripcionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Enrollment of an Alumno in a Grupo. Also used as the pivot model for
 * Alumno::grupos() / Grupo::alumnos(), so it extends Pivot.
 */
class Inscripcion extends Pivot
{
    /** @use HasFactory<InscripcionFactory> */
    use HasFactory;

    protected $table = 'inscripciones';

    public $incrementing = true;

    protected $fillable = [
        'alumno_id',
        'grupo_id',
        'fecha_inscripcion',
        'estado',
        'fecha_baja',
        'motivo_baja',
        'inscrito_por',
        'promedio_final',
        'fecha_cierre',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inscripcion' => 'date',
            'fecha_baja' => 'date',
            'promedio_final' => 'float',
            'fecha_cierre' => 'date',
        ];
    }

    public function alumno(): BelongsTo
    {
        return $this->belongsTo(Alumno::class);
    }

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(Grupo::class);
    }

    public function inscritoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inscrito_por');
    }

    public function calificaciones(): HasMany
    {
        return $this->hasMany(Calificacion::class, 'inscripcion_id');
    }

    public function asistencias(): HasMany
    {
        return $this->hasMany(Asistencia::class, 'inscripcion_id');
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(DocumentoEmitido::class, 'inscripcion_id');
    }

    /**
     * Active enrollments in a running grupo whose attendance is under the risk threshold, in SQL,
     * matching ResumenEscolar::alumnosEnRiesgo(): at least MIN_REGISTROS_RIESGO records and
     * round(100 · (records − faltas) / records) < UMBRAL_RIESGO, i.e. 200 · (records − faltas) < (2 · UMBRAL − 1) · records.
     */
    public function scopeEnRiesgo(Builder $query): Builder
    {
        $total = '(select count(*) from asistencias where asistencias.inscripcion_id = inscripciones.id)';
        $faltas = "(select count(*) from asistencias where asistencias.inscripcion_id = inscripciones.id and asistencias.estado = 'falta')";

        return $query
            ->where('inscripciones.estado', 'activo')
            ->whereHas('grupo', fn ($query) => $query->where('estado', 'en_curso'))
            ->whereRaw("{$total} >= ?", [ResumenEscolar::MIN_REGISTROS_RIESGO])
            ->whereRaw("200 * ({$total} - {$faltas}) < ? * {$total}", [2 * ResumenEscolar::UMBRAL_RIESGO - 1]);
    }
}
