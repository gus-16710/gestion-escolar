<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Alumno;
use App\Models\Director;
use App\Models\Profesor;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The user's own account. Accounts aren't deleted here: they are created and removed by the school
 * (Usuarios, or the person's record).
 */
class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $ficha = $user->ficha();

        return Inertia::render('settings/profile', [
            'cuenta' => [
                'nombre' => $user->name,
                'email' => $user->email,
                'foto_url' => $ficha?->fotoUrl(),
                'roles' => $user->getRoleNames(),
                'tipo' => match (true) {
                    $ficha instanceof Director => 'director',
                    $ficha instanceof Profesor => 'profesor',
                    $ficha instanceof Alumno => 'alumno',
                    default => null,
                },
                'editable' => ! $user->seAdministraDesdeFicha(),
                'miembro_desde' => $user->created_at?->format('Y-m-d'),
                'datos' => $this->datosDeFicha($user),
            ],
        ]);
    }

    /**
     * Update the user's profile settings: only accounts not tied to a person record.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        abort_if($request->user()->seAdministraDesdeFicha(), 403, 'Tus datos los actualiza la dirección desde tu ficha.');

        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return to_route('profile.edit');
    }

    /**
     * What the person record says about them, shown read-only next to the account.
     *
     * @return array<int, array{etiqueta: string, valor: string}>
     */
    private function datosDeFicha(User $user): array
    {
        $ficha = $user->ficha();

        $datos = match (true) {
            $ficha instanceof Alumno => ['Matrícula' => $ficha->matricula],
            $ficha instanceof Profesor => ['Especialidad' => $ficha->especialidad],
            $ficha instanceof Director => ['Planteles' => $ficha->planteles()->orderBy('nombre')->pluck('nombre')->join(', ')],
            default => [],
        };

        if ($ficha !== null) {
            $datos['Teléfono'] = $ficha->telefono;
        }

        return collect($datos)
            ->filter(fn ($valor) => filled($valor))
            ->map(fn ($valor, $etiqueta) => ['etiqueta' => $etiqueta, 'valor' => (string) $valor])
            ->values()
            ->all();
    }
}
