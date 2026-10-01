<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionController extends Controller
{
    /**
     * Read-only matrix of what each role can do; permissions are edited from Roles.
     */
    public function index(): Response
    {
        $roles = Role::with('permissions:id,name')
            ->orderByRaw("case name when 'Admin' then 0 when 'Director' then 1 when 'Profesor' then 2 when 'Alumno' then 3 else 4 end")
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name'),
                'users_count' => User::role($role->name)->count(),
            ]);

        return Inertia::render('admin/permissions/index', [
            'permissions' => Permission::orderBy('name')->pluck('name'),
            'roles' => $roles,
        ]);
    }
}
