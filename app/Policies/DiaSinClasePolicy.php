<?php

namespace App\Policies;

use App\Models\DiaSinClase;
use App\Models\User;

class DiaSinClasePolicy
{
    /**
     * Anyone who sees grupos sees the school calendar.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view groups');
    }

    /**
     * Group managers add days without class: a Director only for the planteles they run (checked on the plantel_id).
     */
    public function create(User $user): bool
    {
        return $user->can('manage groups');
    }

    /**
     * School-wide days (plantel_id null) are only for unrestricted managers (Admin); plantel days, for whoever runs it.
     */
    public function update(User $user, DiaSinClase $dia): bool
    {
        return $user->can('manage groups') && $user->alcanzaPlantel($dia->plantel_id);
    }

    public function delete(User $user, DiaSinClase $dia): bool
    {
        return $this->update($user, $dia);
    }
}
