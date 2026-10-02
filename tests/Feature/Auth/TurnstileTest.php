<?php

use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['services.turnstile' => ['site_key' => 'clave-publica', 'secret_key' => 'clave-secreta']]);
    $this->user = User::factory()->create();
});

test('without keys the login has no robot check', function () {
    config(['services.turnstile' => ['site_key' => null, 'secret_key' => null]]);

    $this->get('/login')->assertInertia(fn ($page) => $page->where('turnstileSiteKey', null));
    $this->post('/login', ['email' => $this->user->email, 'password' => 'password']);

    $this->assertAuthenticated();
});

test('with keys the login page gets the site key and requires the check', function () {
    Http::fake();

    $this->get('/login')->assertInertia(fn ($page) => $page->where('turnstileSiteKey', 'clave-publica'));

    $this->post('/login', ['email' => $this->user->email, 'password' => 'password'])
        ->assertSessionHasErrors(['cf-turnstile-response' => 'Confirma que no eres un robot.']);

    $this->assertGuest();
    Http::assertNothingSent();
});

test('a token Cloudflare accepts lets the user in', function () {
    Http::fake(['challenges.cloudflare.com/*' => Http::response(['success' => true])]);

    $this->post('/login', ['email' => $this->user->email, 'password' => 'password', 'cf-turnstile-response' => 'token-bueno'])
        ->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticated();
    Http::assertSent(fn (Request $request) => $request['secret'] === 'clave-secreta' && $request['response'] === 'token-bueno');
});

test('a token Cloudflare rejects, or an unreachable Cloudflare, keeps the user out', function () {
    Http::fake(['challenges.cloudflare.com/*' => Http::response(['success' => false, 'error-codes' => ['timeout-or-duplicate']])]);

    $this->post('/login', ['email' => $this->user->email, 'password' => 'password', 'cf-turnstile-response' => 'token-usado'])
        ->assertSessionHasErrors(['cf-turnstile-response' => 'La verificación expiró o no es válida. Vuelve a marcar la casilla.']);
    $this->assertGuest();

    Http::fake(['challenges.cloudflare.com/*' => fn () => throw new ConnectionException('sin red')]);

    $this->post('/login', ['email' => $this->user->email, 'password' => 'password', 'cf-turnstile-response' => 'token'])
        ->assertSessionHasErrors('cf-turnstile-response');
    $this->assertGuest();
});
