<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;

/**
 * Shared login-account handling for person records (Profesor, Alumno) that
 * optionally own a User via a nullable `user_id`.
 */
trait ManagesLoginAccounts
{
    /**
     * Validation rules for the email / crear_cuenta / password fields.
     *
     * @param  Model|null  $persona  record being updated (null when creating)
     * @return array<string, mixed>
     */
    protected function accountRules(Request $request, ?Model $persona): array
    {
        $tieneCuenta = $persona?->user_id !== null;
        $necesitaCuenta = $tieneCuenta || $request->boolean('crear_cuenta');

        return [
            'email' => [
                Rule::requiredIf($necesitaCuenta),
                'nullable',
                'string',
                'lowercase',
                'email',
                'max:255',
                ...($necesitaCuenta ? [Rule::unique('users', 'email')->ignore($persona?->user_id)] : []),
            ],
            'crear_cuenta' => ['boolean'],
            'password' => [
                Rule::requiredIf(! $tieneCuenta && $request->boolean('crear_cuenta')),
                'nullable',
                'confirmed',
                Rules\Password::defaults(),
            ],
        ];
    }

    /**
     * Create the account when requested, or keep an existing one in sync with the record.
     *
     * @param  array<string, mixed>  $validated
     */
    protected function syncAccount(Model $persona, array $validated, string $rol): void
    {
        if ($persona->user) {
            $persona->user->name = $persona->nombre_completo;
            $persona->user->email = $validated['email'];

            if (! empty($validated['password'])) {
                $persona->user->password = $validated['password'];
            }

            $persona->user->save();

            return;
        }

        if ($validated['crear_cuenta'] ?? false) {
            $user = User::create([
                'name' => $persona->nombre_completo,
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);

            $user->assignRole($rol);

            $persona->user_id = $user->id;
        }
    }
}
