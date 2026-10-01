<?php

namespace App\Models;

use Database\Factories\CursoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Curso extends Model
{
    /** @use HasFactory<CursoFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nombre',
        'clave',
        'descripcion',
        'duracion_semanas',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'duracion_semanas' => 'integer',
            'activo' => 'boolean',
        ];
    }

    public function planteles(): BelongsToMany
    {
        return $this->belongsToMany(Plantel::class)->withTimestamps();
    }

    public function grupos(): HasMany
    {
        return $this->hasMany(Grupo::class);
    }

    /**
     * The study plan, in teaching order.
     */
    public function modulos(): HasMany
    {
        return $this->hasMany(CursoModulo::class)->orderBy('orden');
    }

    /**
     * Enrollments across every grupo of the curso.
     */
    public function inscripciones(): HasManyThrough
    {
        return $this->hasManyThrough(Inscripcion::class, Grupo::class, 'curso_id', 'grupo_id');
    }
}
