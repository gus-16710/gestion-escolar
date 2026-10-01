<?php

namespace App\Models;

use Database\Factories\DirectorFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A Director's record. Unlike profesores and alumnos, a director always has a login
 * account; the planteles they run hang off that account (`plantel_user`), which is what
 * User::plantelesAlcance() reads.
 */
class Director extends Model
{
    /** @use HasFactory<DirectorFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'directores';

    protected $fillable = [
        'user_id',
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'curp',
        'fecha_nacimiento',
        'telefono',
        'email',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Planteles this director runs, stored against their account in `plantel_user`.
     */
    public function planteles(): BelongsToMany
    {
        return $this->belongsToMany(Plantel::class, 'plantel_user', 'user_id', 'plantel_id', 'user_id')->withTimestamps();
    }

    protected function nombreCompleto(): Attribute
    {
        return Attribute::get(fn () => trim("{$this->nombre} {$this->apellido_paterno} {$this->apellido_materno}"));
    }
}
