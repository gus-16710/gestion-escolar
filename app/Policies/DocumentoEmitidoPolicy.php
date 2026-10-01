<?php

namespace App\Policies;

use App\Models\DocumentoEmitido;
use App\Models\User;

class DocumentoEmitidoPolicy
{
    /**
     * An issued document is downloaded again by whoever can report on its grupo.
     */
    public function view(User $user, DocumentoEmitido $documento): bool
    {
        $grupo = $documento->inscripcion->grupo()->withTrashed()->first();

        return $grupo !== null && $user->can('report', $grupo);
    }

    /**
     * Only an unrestricted reports user (the Admin) voids a document, and only once.
     */
    public function void(User $user, DocumentoEmitido $documento): bool
    {
        return $documento->vigente() && $user->can('view reports') && $user->plantelesAlcance() === null;
    }
}
