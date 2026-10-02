<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Planteles this staff member (Director, Admin) is assigned to.
     */
    public function planteles(): BelongsToMany
    {
        return $this->belongsToMany(Plantel::class)->withTimestamps();
    }

    /**
     * Planteles whose data this user may work with: null means every plantel (Admin and
     * other unrestricted users); a Director is limited to the planteles assigned to them.
     *
     * @return array<int, int>|null
     */
    public function plantelesAlcance(): ?array
    {
        return once(fn () => $this->hasRole('Director') && ! $this->hasRole('Admin')
            ? $this->planteles()->pluck('planteles.id')->all()
            : null);
    }

    /**
     * Whether the given plantel is within this user's reach.
     */
    public function alcanzaPlantel(?int $plantelId): bool
    {
        $alcance = $this->plantelesAlcance();

        return $alcance === null || in_array($plantelId, $alcance, true);
    }

    /**
     * Id of this user's profesor record, if they teach (a Director may too).
     */
    public function profesorId(): ?int
    {
        return $this->profesor?->id;
    }

    public function profesor(): HasOne
    {
        return $this->hasOne(Profesor::class);
    }

    public function director(): HasOne
    {
        return $this->hasOne(Director::class);
    }

    public function alumno(): HasOne
    {
        return $this->hasOne(Alumno::class);
    }

    /**
     * The person record behind the account (director, profesor or alumno), if any.
     */
    public function ficha(): Director|Profesor|Alumno|null
    {
        return $this->director ?? $this->profesor ?? $this->alumno;
    }

    /**
     * A director's, profesor's or alumno's account takes its name and email from their record, so it is
     * changed there (the record keeps both in sync); administrators always manage their own account.
     */
    public function seAdministraDesdeFicha(): bool
    {
        return ! $this->hasRole('Admin') && $this->ficha() !== null;
    }
}
