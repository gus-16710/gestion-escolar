<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * Roles the application relies on by name (dashboards, plantel scoping, person modules):
     * they can't be renamed or deleted, only have their permissions adjusted.
     */
    public const ROLES_DEL_SISTEMA = ['Admin', 'Director', 'Profesor', 'Alumno'];

    /**
     * Where accounts with each system role are registered; any other role is assigned in Usuarios.
     */
    private const ALTA_EN = [
        'Director' => ['Directores', 'admin.directores.index'],
        'Profesor' => ['Profesores', 'profesores.index'],
        'Alumno' => ['Alumnos', 'alumnos.index'],
    ];

    /**
     * Display a listing of roles with their permission and user counts.
     */
    public function index(): Response
    {
        $roles = Role::with('permissions:id,name')
            ->withCount('permissions')
            ->orderByRaw("case name when 'Admin' then 0 when 'Director' then 1 when 'Profesor' then 2 when 'Alumno' then 3 else 4 end")
            ->orderBy('name')
            ->get()
            ->map(function (Role $role) {
                $cuentas = User::role($role->name)->orderBy('name');

                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'permissions' => $role->permissions->pluck('name'),
                    'permissions_count' => $role->permissions_count,
                    'users_count' => (clone $cuentas)->count(),
                    // A few names for the card; the full list is in Usuarios.
                    'muestra' => $cuentas->limit(3)->pluck('name'),
                    'es_sistema' => in_array($role->name, self::ROLES_DEL_SISTEMA, true),
                    'alta_en' => $this->altaEn($role),
                ];
            });

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
        ]);
    }

    /**
     * Show the form for creating a new role.
     */
    public function create(): Response
    {
        return Inertia::render('admin/roles/create', [
            'permissions' => Permission::pluck('name'),
        ]);
    }

    /**
     * Store a newly created role.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::create(['name' => $validated['name']]);
        $role->syncPermissions($validated['permissions'] ?? []);

        return to_route('admin.roles.index');
    }

    /**
     * Show the form for editing the given role.
     */
    public function edit(Role $role): Response
    {
        $role->load('permissions:id,name');

        return Inertia::render('admin/roles/edit', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name'),
                'es_sistema' => in_array($role->name, self::ROLES_DEL_SISTEMA, true),
                'users_count' => User::role($role->name)->count(),
                'alta_en' => $this->altaEn($role),
            ],
            'permissions' => Permission::pluck('name'),
        ]);
    }

    /**
     * The module where accounts with this role are registered.
     *
     * @return array{modulo: string, url: string}
     */
    private function altaEn(Role $role): array
    {
        [$modulo, $ruta] = self::ALTA_EN[$role->name] ?? ['Usuarios', 'admin.users.index'];

        return ['modulo' => $modulo, 'url' => route($ruta)];
    }

    /**
     * Update the given role.
     */
    public function update(Request $request, Role $role): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($role->id)],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        if (in_array($role->name, self::ROLES_DEL_SISTEMA, true) && $validated['name'] !== $role->name) {
            return back()->withErrors([
                'name' => "El rol {$role->name} es del sistema y no se puede renombrar.",
            ]);
        }

        $role->name = $validated['name'];
        $role->save();

        // The Admin role always keeps every permission.
        $role->syncPermissions($role->name === 'Admin' ? Permission::all() : ($validated['permissions'] ?? []));

        return to_route('admin.roles.index');
    }

    /**
     * Remove the given role.
     */
    public function destroy(Role $role): RedirectResponse
    {
        if (in_array($role->name, self::ROLES_DEL_SISTEMA, true)) {
            return back()->withErrors([
                'role' => "El rol {$role->name} es del sistema y no se puede eliminar.",
            ]);
        }

        $usersCount = User::role($role->name)->count();

        if ($usersCount > 0) {
            return back()->withErrors([
                'role' => "No puedes eliminar este rol: está asignado a {$usersCount} usuario(s). Quítaselo primero.",
            ]);
        }

        $role->delete();

        return to_route('admin.roles.index');
    }
}
