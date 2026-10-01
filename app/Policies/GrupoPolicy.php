<?php

namespace App\Policies;

use App\Models\Grupo;
use App\Models\User;

class GrupoPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('view groups');
    }

    /**
     * Group managers see the grupos of their planteles; anyone sees the grupos they teach.
     */
    public function view(User $user, Grupo $grupo): bool
    {
        if ($user->can('manage groups') && $user->alcanzaPlantel($grupo->plantel_id)) {
            return true;
        }

        return $user->can('view groups') && $this->imparte($user, $grupo);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('manage groups');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Grupo $grupo): bool
    {
        return $this->manages($user, $grupo);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Grupo $grupo): bool
    {
        return $this->manages($user, $grupo);
    }

    /**
     * Determine whether the user can enroll alumnos in, or drop them from, the grupo.
     */
    public function enroll(User $user, Grupo $grupo): bool
    {
        return $this->manages($user, $grupo);
    }

    /**
     * Whoever can see the grupo and holds `view attendance` can review its attendance.
     */
    public function viewAttendance(User $user, Grupo $grupo): bool
    {
        return $user->can('view attendance') && $this->view($user, $grupo);
    }

    /**
     * Attendance is taken by `manage attendance` holders on the grupos they teach (an Admin on
     * any grupo), never on cancelled ones. A Director who also teaches takes it only in their own
     * grupos; in the rest of their plantel they can only review it.
     */
    public function takeAttendance(User $user, Grupo $grupo): bool
    {
        $sinRestriccion = $user->can('manage groups') && $user->plantelesAlcance() === null;

        return $user->can('manage attendance')
            && ($sinRestriccion || $this->imparte($user, $grupo))
            && $grupo->estado !== 'cancelado';
    }

    /**
     * Whoever can see the grupo and holds `view grades` can review its grades.
     */
    public function viewGrades(User $user, Grupo $grupo): bool
    {
        return $user->can('view grades') && $this->view($user, $grupo);
    }

    /**
     * Grades are recorded like attendance: by `manage grades` holders on the grupos they teach (an Admin on
     * any grupo), never on cancelled ones. A Director only reviews them.
     */
    public function gradeStudents(User $user, Grupo $grupo): bool
    {
        $sinRestriccion = $user->can('manage groups') && $user->plantelesAlcance() === null;

        return $user->can('manage grades')
            && ($sinRestriccion || $this->imparte($user, $grupo))
            && $grupo->estado !== 'cancelado';
    }

    /**
     * A class is marked as not given (or made up) by whoever takes its attendance or runs the grupo's plantel.
     */
    public function suspendClass(User $user, Grupo $grupo): bool
    {
        return $grupo->estado !== 'cancelado' && ($this->takeAttendance($user, $grupo) || $this->manages($user, $grupo));
    }

    private function manages(User $user, Grupo $grupo): bool
    {
        return $user->can('manage groups') && $user->alcanzaPlantel($grupo->plantel_id);
    }

    private function imparte(User $user, Grupo $grupo): bool
    {
        return $grupo->profesor_id !== null && $grupo->profesor_id === $user->profesorId();
    }
}
