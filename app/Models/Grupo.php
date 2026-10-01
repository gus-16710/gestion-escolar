<?php

namespace App\Models;

use Database\Factories\GrupoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Grupo extends Model
{
    /** @use HasFactory<GrupoFactory> */
    use HasFactory, SoftDeletes;

    /**
     * States in which a grupo is running or about to run (accepts enrollments, blocks deletions).
     */
    public const ESTADOS_ACTIVOS = ['planeado', 'en_curso'];

    public const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    protected $fillable = [
        'plantel_id',
        'curso_id',
        'profesor_id',
        'clave',
        'turno',
        'dias',
        'hora_inicio',
        'hora_fin',
        'fecha_inicio',
        'fecha_fin',
        'cupo',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'fecha_fin' => 'date',
            'cupo' => 'integer',
        ];
    }

    /**
     * Next clave for a grupo of the given curso at the given plantel: {CURSO}-{PLANTEL}-{AÑO}-{A..Z}.
     * Trashed grupos are counted so a clave is never reused; after Z it continues with numbers (27, 28...).
     */
    public static function siguienteClave(Curso $curso, Plantel $plantel, int $year): string
    {
        $prefijo = "{$curso->clave}-{$plantel->clave}-{$year}-";
        $existentes = static::withTrashed()->where('clave', 'like', "{$prefijo}%")->count();

        return $prefijo.($existentes < 26 ? chr(ord('A') + $existentes) : (string) ($existentes + 1));
    }

    public function admiteInscripciones(): bool
    {
        return in_array($this->estado, self::ESTADOS_ACTIVOS, true);
    }

    /**
     * Grupos the given user may see: group managers see those in their planteles (every plantel
     * for an Admin) plus the ones they teach; profesores only the ones they teach.
     */
    public function scopeVisiblePara(Builder $query, User $user): Builder
    {
        if ($user->can('manage groups')) {
            $alcance = $user->plantelesAlcance();

            // A director also sees the grupos they teach, even at a plantel they don't run.
            return $alcance === null ? $query : $query->where(fn ($query) => $query
                ->whereIn('plantel_id', $alcance)
                ->orWhere('profesor_id', $user->profesorId() ?? 0));
        }

        return $query->where('profesor_id', $user->profesorId() ?? 0);
    }

    public function plantel(): BelongsTo
    {
        return $this->belongsTo(Plantel::class);
    }

    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class);
    }

    public function profesor(): BelongsTo
    {
        return $this->belongsTo(Profesor::class);
    }

    public function inscripciones(): HasMany
    {
        return $this->hasMany(Inscripcion::class);
    }

    public function alumnos(): BelongsToMany
    {
        return $this->belongsToMany(Alumno::class, 'inscripciones')
            ->using(Inscripcion::class)
            ->withPivot('id', 'estado', 'fecha_inscripcion', 'fecha_baja')
            ->withTimestamps();
    }

    public function clasesSuspendidas(): HasMany
    {
        return $this->hasMany(ClaseSuspendida::class)->orderBy('fecha');
    }

    public function asistencias(): HasManyThrough
    {
        // Keys are explicit because Inscripcion extends Pivot, which can't infer them.
        return $this->hasManyThrough(Asistencia::class, Inscripcion::class, 'grupo_id', 'inscripcion_id');
    }
}
