<?php

namespace App\Models;

use Database\Factories\ProfesorFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Profesor extends Model
{
    /** @use HasFactory<ProfesorFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'profesores';

    protected $fillable = [
        'user_id',
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'curp',
        'fecha_nacimiento',
        'telefono',
        'email',
        'especialidad',
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
     * Public URL of the photo stored on the `public` disk (see Alumno::fotoUrl()).
     */
    public function fotoUrl(): ?string
    {
        return $this->foto ? asset('storage/'.$this->foto) : null;
    }

    /**
     * Profesores the given user may see: a Director sees those with a grupo in one of their
     * planteles plus those with no grupo yet; everyone else sees all of them.
     */
    public function scopeVisiblePara(Builder $query, User $user): Builder
    {
        $alcance = $user->plantelesAlcance();

        if ($alcance === null) {
            return $query;
        }

        return $query->where(fn ($query) => $query
            ->whereHas('grupos', fn ($query) => $query->whereIn('plantel_id', $alcance))
            ->orWhereDoesntHave('grupos')
            // A director who also teaches always sees their own record.
            ->orWhere($query->qualifyColumn('id'), $user->profesorId() ?? 0));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function grupos(): HasMany
    {
        return $this->hasMany(Grupo::class);
    }

    protected function nombreCompleto(): Attribute
    {
        return Attribute::get(fn () => trim("{$this->nombre} {$this->apellido_paterno} {$this->apellido_materno}"));
    }
}
