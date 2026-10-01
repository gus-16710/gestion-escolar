<?php

namespace App\Policies;

use App\Models\Plantel;
use App\Models\User;

class PlantelPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view planteles');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Plantel $plantel): bool
    {
        return $user->can('view planteles') && $user->alcanzaPlantel($plantel->id);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('manage planteles');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Plantel $plantel): bool
    {
        return $user->can('manage planteles') && $user->alcanzaPlantel($plantel->id);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Plantel $plantel): bool
    {
        return $user->can('manage planteles');
    }
}
