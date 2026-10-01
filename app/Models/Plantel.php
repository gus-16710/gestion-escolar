<?php

namespace App\Models;

use Database\Factories\PlantelFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Plantel extends Model
{
    /** @use HasFactory<PlantelFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'planteles';

    protected $fillable = [
        'nombre',
        'clave',
        'calle',
        'numero_exterior',
        'numero_interior',
        'colonia',
        'codigo_postal',
        'localidad',
        'municipio',
        'estado',
        'telefono',
        'email',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    /**
     * Planteles within the given user's reach (all of them unless they are a Director).
     */
    public function scopeAlcanceDe(Builder $query, User $user): Builder
    {
        $alcance = $user->plantelesAlcance();

        return $alcance === null ? $query : $query->whereIn($this->qualifyColumn('id'), $alcance);
    }

    public function cursos(): BelongsToMany
    {
        return $this->belongsToMany(Curso::class)->withTimestamps();
    }

    public function grupos(): HasMany
    {
        return $this->hasMany(Grupo::class);
    }

    /**
     * Enrollments across every grupo of the plantel.
     */
    public function inscripciones(): HasManyThrough
    {
        return $this->hasManyThrough(Inscripcion::class, Grupo::class, 'plantel_id', 'grupo_id');
    }

    /**
     * Staff (Directors, admins) assigned to this plantel.
     */
    public function usuarios(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    protected function direccionCompleta(): Attribute
    {
        return Attribute::get(function () {
            $numero = $this->numero_exterior.($this->numero_interior ? " Int. {$this->numero_interior}" : '');

            return "{$this->calle} {$numero}, Col. {$this->colonia}, C.P. {$this->codigo_postal}, {$this->localidad}, {$this->municipio}, {$this->estado}";
        });
    }
}
