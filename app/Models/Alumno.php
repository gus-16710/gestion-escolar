<?php

namespace App\Models;

use Database\Factories\AlumnoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Alumno extends Model
{
    /** @use HasFactory<AlumnoFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'matricula',
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'curp',
        'fecha_nacimiento',
        'genero',
        'telefono',
        'email',
        'direccion',
        'contacto_emergencia_nombre',
        'contacto_emergencia_telefono',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'fecha_nacimiento' => 'date',
            'activo' => 'boolean',
        ];
    }

    /**
     * Public URL of the photo stored on the `public` disk (needs `php artisan storage:link`).
     * Built with asset() so it follows the current host instead of APP_URL.
     */
    public function fotoUrl(): ?string
    {
        return $this->foto ? asset('storage/'.$this->foto) : null;
    }

    /**
     * Alumnos the given user may see.
     *  - Profesores (no `manage students`): only those enrolled in a grupo they teach.
     *  - Directors: those with an enrollment in one of their planteles, plus newly registered
     *    alumnos with no enrollment yet (so they can be placed in a grupo).
     *  - Everyone else with `manage students` (Admin): all of them.
     */
    public function scopeVisiblePara(Builder $query, User $user): Builder
    {
        $profesorId = $user->profesorId() ?? 0;

        if (! $user->can('manage students')) {
            return $query->whereHas('inscripciones.grupo', fn ($query) => $query->where('profesor_id', $profesorId));
        }

        $alcance = $user->plantelesAlcance();

        if ($alcance === null) {
            return $query;
        }

        // A director who also teaches sees their own students at any plantel.
        return $query->where(fn ($query) => $query
            ->whereHas('inscripciones.grupo', fn ($query) => $query->where(fn ($query) => $query->whereIn('plantel_id', $alcance)->orWhere('profesor_id', $profesorId)))
            ->orWhereDoesntHave('inscripciones'));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inscripciones(): HasMany
    {
        return $this->hasMany(Inscripcion::class);
    }

    public function grupos(): BelongsToMany
    {
        return $this->belongsToMany(Grupo::class, 'inscripciones')
            ->using(Inscripcion::class)
            ->withPivot('id', 'estado', 'fecha_inscripcion', 'fecha_baja')
            ->withTimestamps();
    }

    /**
     * Next school-wide matrícula: {AÑO}-{0001}. It carries no plantel because an alumno can study
     * at several. The sequence restarts every year; trashed alumnos are counted so a number is never
     * reused. Older formats (SM-2026-0001, A20260001) don't match the prefix and are left alone.
     * Call inside a transaction: the row lock serializes concurrent registrations.
     */
    public static function siguienteMatricula(): string
    {
        $prefijo = now()->year.'-';

        $ultima = static::withTrashed()
            ->where('matricula', 'like', "{$prefijo}%")
            ->orderByDesc('matricula')
            ->lockForUpdate()
            ->value('matricula');

        $consecutivo = $ultima ? ((int) substr($ultima, strlen($prefijo))) + 1 : 1;

        return $prefijo.str_pad((string) $consecutivo, 4, '0', STR_PAD_LEFT);
    }

    protected function nombreCompleto(): Attribute
    {
        return Attribute::get(fn () => trim("{$this->nombre} {$this->apellido_paterno} {$this->apellido_materno}"));
    }
}
