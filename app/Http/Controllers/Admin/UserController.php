<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Administrator accounts (and custom roles). Directores, profesores and alumnos are registered
 * in their own module, together with their record, so their roles are not offered here and
 * their accounts are edited from that record.
 */
class UserController extends Controller
{
    /** Roles that belong to a person record and are granted from its module, never from this screen. */
    public const ROLES_CON_FICHA = ['Director', 'Profesor', 'Alumno'];

    /** Filters of the listing: administration accounts by default, the rest to look up who has access. */
    private const TIPOS = ['administracion', 'directores', 'profesores', 'alumnos', 'todas'];

    /**
     * Display a listing of accounts, filtered by type (administration by default).
     */
    public function index(Request $request): Response
    {
        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 15, 20], true)) {
            $perPage = 10;
        }

        $tipo = in_array($request->string('tipo')->toString(), self::TIPOS, true) ? $request->string('tipo')->toString() : 'administracion';
        $search = trim((string) $request->string('search'));

        $users = $this->filtrarPorTipo(User::query(), $tipo)
            ->with('roles:id,name', 'director:id,user_id,foto', 'profesor:id,user_id,foto', 'alumno:id,user_id,foto')
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->orderBy('name')
            ->paginate($perPage, ['id', 'name', 'email'])
            ->withQueryString();

        $actividad = $this->ultimaActividad($users->getCollection()->modelKeys());

        $users->through(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name'),
            'tipo' => $this->tipoDe($user),
            'ficha_url' => $this->fichaUrl($user),
            'foto_url' => $this->fotoDe($user),
            'ultima_actividad' => $actividad[$user->id] ?? null,
            'es_yo' => $user->id === $request->user()->id,
        ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'conteos' => collect(self::TIPOS)->mapWithKeys(fn (string $t) => [$t => $this->filtrarPorTipo(User::query(), $t)->count()]),
            'tipo' => $tipo,
            'search' => $search,
            'perPage' => $perPage,
        ]);
    }

    /**
     * Show the form for creating a new user.
     */
    public function create(): Response
    {
        return Inertia::render('admin/users/create', [
            'roles' => $this->rolesDeUsuarios(),
            'permisosDeRoles' => $this->permisosDeRoles(),
            'permissions' => Permission::pluck('name'),
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            ...$this->reglasDeAcceso(),
        ], $this->mensajes());

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->syncRoles($validated['roles'] ?? []);
        $user->syncPermissions($validated['permissions'] ?? []);

        return to_route('admin.users.index');
    }

    /**
     * Show the form for editing the given user; accounts that belong to a person record are edited from that record.
     */
    public function edit(Request $request, User $user): Response|RedirectResponse
    {
        if ($url = $this->fichaUrl($user)) {
            return redirect($url);
        }

        $user->load('roles:id,name', 'permissions:id,name');

        return Inertia::render('admin/users/edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name')->diff(self::ROLES_CON_FICHA)->values(),
                'permissions' => $user->permissions->pluck('name'),
                // Roles of a record it also has (an admin who is a director, say): kept on save, shown read-only.
                'roles_de_ficha' => $user->roles->pluck('name')->intersect(self::ROLES_CON_FICHA)->values(),
                'creado' => $user->created_at?->format('Y-m-d'),
                'ultima_actividad' => $this->ultimaActividad([$user->id])[$user->id] ?? null,
                'es_yo' => $user->id === $request->user()->id,
            ],
            'roles' => $this->rolesDeUsuarios(),
            'permisosDeRoles' => $this->permisosDeRoles(),
            'permissions' => Permission::pluck('name'),
        ]);
    }

    /**
     * Update the given user.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        if ($this->fichaUrl($user)) {
            return back()->withErrors(['user' => $this->mensajeFicha($user)]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            ...$this->reglasDeAcceso(),
        ], $this->mensajes());

        $roles = $validated['roles'] ?? [];

        if ($user->hasRole('Admin') && ! in_array('Admin', $roles, true) && User::role('Admin')->count() === 1) {
            return back()->withErrors([
                'roles' => 'No puedes quitar el rol Admin al único administrador del sistema.',
            ]);
        }

        $user->name = $validated['name'];
        $user->email = $validated['email'];

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        // Director/Profesor/Alumno roles are managed from their modules: keep whichever the account already had.
        $user->syncRoles([...$roles, ...$user->getRoleNames()->intersect(self::ROLES_CON_FICHA)]);
        $user->syncPermissions($validated['permissions'] ?? []);

        return to_route('admin.users.index');
    }

    /**
     * Remove the given user.
     */
    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->withErrors([
                'user' => 'No puedes eliminar tu propia cuenta.',
            ]);
        }

        if ($this->fichaUrl($user)) {
            return back()->withErrors(['user' => $this->mensajeFicha($user)]);
        }

        $user->delete();

        return to_route('admin.users.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function reglasDeAcceso(): array
    {
        return [
            'roles' => ['array'],
            'roles.*' => ['string', 'exists:roles,name', Rule::notIn(self::ROLES_CON_FICHA)],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function mensajes(): array
    {
        return [
            'roles.*.not_in' => 'Los directores, profesores y alumnos se registran desde su propio módulo (Directores, Profesores o Alumnos).',
        ];
    }

    /**
     * Every role's permissions, so the form can preview what an account will be able to do.
     *
     * @return Collection<string, Collection<int, string>>
     */
    private function permisosDeRoles(): Collection
    {
        return Role::with('permissions:id,name')->get()->mapWithKeys(fn (Role $role) => [$role->name => $role->permissions->pluck('name')]);
    }

    /**
     * Latest request of each account, from the database session store (ISO 8601). Sessions are pruned when they
     * expire, so an account without a live session has none.
     *
     * @param  array<int, int>  $userIds
     * @return array<int, string>
     */
    private function ultimaActividad(array $userIds): array
    {
        if (config('session.driver') !== 'database') {
            return [];
        }

        return DB::table(config('session.table', 'sessions'))
            ->whereIn('user_id', $userIds)
            ->selectRaw('user_id, max(last_activity) as ultima')
            ->groupBy('user_id')
            ->pluck('ultima', 'user_id')
            ->map(fn ($segundos) => Carbon::createFromTimestamp((int) $segundos, config('app.timezone'))->toIso8601String())
            ->all();
    }

    /**
     * The photo of the person record behind the account, if any.
     */
    private function fotoDe(User $user): ?string
    {
        return ($user->director ?? $user->profesor ?? $user->alumno)?->fotoUrl();
    }

    /**
     * @return Collection<int, string>
     */
    private function rolesDeUsuarios(): Collection
    {
        return Role::whereNotIn('name', self::ROLES_CON_FICHA)->pluck('name');
    }

    /**
     * Where to manage an account that belongs to a director, profesor or alumno record, or null when it is
     * managed here. Administrators are always managed here, even if they also have a record.
     */
    private function fichaUrl(User $user): ?string
    {
        return match (true) {
            $user->hasRole('Admin') => null,
            $user->director !== null => route('admin.directores.edit', $user->director),
            $user->profesor !== null => route('profesores.edit', $user->profesor),
            $user->alumno !== null => route('alumnos.edit', $user->alumno),
            default => null,
        };
    }

    /**
     * Administration accounts are admins plus any account without a director, profesor or alumno record.
     */
    private function filtrarPorTipo(Builder $query, string $tipo): Builder
    {
        return match ($tipo) {
            'directores' => $query->whereHas('director'),
            'profesores' => $query->whereHas('profesor'),
            'alumnos' => $query->whereHas('alumno'),
            'todas' => $query,
            default => $query->where(fn ($query) => $query
                ->whereHas('roles', fn ($query) => $query->where('name', 'Admin'))
                ->orWhere(fn ($query) => $query->whereDoesntHave('director')->whereDoesntHave('profesor')->whereDoesntHave('alumno'))),
        };
    }

    /**
     * The account's type as shown in the listing, consistent with fichaUrl().
     */
    private function tipoDe(User $user): string
    {
        return match (true) {
            $user->hasRole('Admin') => 'Administración',
            $user->director !== null => 'Director',
            $user->profesor !== null => 'Profesor',
            $user->alumno !== null => 'Alumno',
            default => 'Administración',
        };
    }

    private function mensajeFicha(User $user): string
    {
        $persona = match (true) {
            $user->director !== null => 'un director',
            $user->profesor !== null => 'un profesor',
            default => 'un alumno',
        };

        return "Esta cuenta pertenece a {$persona}; adminístrala desde su ficha.";
    }
}
