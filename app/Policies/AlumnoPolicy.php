<?php

namespace App\Policies;

use App\Models\Alumno;
use App\Models\User;

class AlumnoPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view students');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Alumno $alumno): bool
    {
        return $user->can('view students') && $this->visible($user, $alumno);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('manage students');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Alumno $alumno): bool
    {
        return $user->can('manage students') && $this->visible($user, $alumno);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Alumno $alumno): bool
    {
        return $user->can('manage students') && $this->visible($user, $alumno);
    }

    /**
     * Within the user's reach, as defined by Alumno::scopeVisiblePara().
     */
    private function visible(User $user, Alumno $alumno): bool
    {
        return Alumno::visiblePara($user)->whereKey($alumno->id)->exists();
    }
}
