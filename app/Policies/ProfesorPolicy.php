<?php

namespace App\Policies;

use App\Models\Profesor;
use App\Models\User;

class ProfesorPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view teachers');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Profesor $profesor): bool
    {
        return $user->can('view teachers') && $this->visible($user, $profesor);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('manage teachers');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Profesor $profesor): bool
    {
        return $user->can('manage teachers') && $this->visible($user, $profesor);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Profesor $profesor): bool
    {
        return $user->can('manage teachers') && $this->visible($user, $profesor);
    }

    /**
     * Within the user's reach, as defined by Profesor::scopeVisiblePara().
     */
    private function visible(User $user, Profesor $profesor): bool
    {
        return Profesor::visiblePara($user)->whereKey($profesor->id)->exists();
    }
}
