<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * The Cloudflare Turnstile token of the "no soy un robot" widget, checked against Cloudflare.
 * Only applied when both keys are configured (Turnstile::activo()).
 */
class Turnstile implements ValidationRule
{
    private const VERIFICAR = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public function __construct(private ?string $ip = null) {}

    public static function activo(): bool
    {
        return filled(config('services.turnstile.site_key')) && filled(config('services.turnstile.secret_key'));
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            $fail('Confirma que no eres un robot.');

            return;
        }

        try {
            $respuesta = Http::asForm()->timeout(10)->post(self::VERIFICAR, [
                'secret' => config('services.turnstile.secret_key'),
                'response' => $value,
                'remoteip' => $this->ip,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Turnstile: no se pudo verificar', ['error' => $e->getMessage()]);
            $fail('No se pudo comprobar la verificación. Inténtalo de nuevo.');

            return;
        }

        if (! $respuesta->json('success')) {
            $fail('La verificación expiró o no es válida. Vuelve a marcar la casilla.');
        }
    }
}
