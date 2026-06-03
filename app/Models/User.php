<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'dni',
        'birthdate',
        'email',
        'password',
        'is_superadmin',
        'tenant_id',
        'branch_id',
        'role_id',
        'cargo_id',
        'phone',
        'is_active',
        'is_trainer',
        'contract_type',
        'salary',
        'cost_per_hour',
        'availability',
        'specialty',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'birthdate' => 'date',
            'password' => 'hashed',
            'is_superadmin' => 'boolean',
            'tenant_id' => 'integer',
            'branch_id' => 'integer',
            'is_active' => 'boolean',
            'is_trainer' => 'boolean',
            'salary' => 'decimal:2',
            'cost_per_hour' => 'decimal:2',
        ];
    }

    public function isSuperadmin(): bool
    {
        return (bool) $this->is_superadmin;
    }

    /** @return BelongsTo<Role, User> */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /** @return BelongsTo<Cargo, User> */
    public function cargo(): BelongsTo
    {
        return $this->belongsTo(Cargo::class);
    }

    /** @return BelongsToMany<Area, User> */
    public function areas(): BelongsToMany
    {
        return $this->belongsToMany(Area::class, 'area_user');
    }

    /** @return BelongsToMany<Project, User> */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_user');
    }

    /**
     * @return array<string, mixed>
     */
    public function authPayload(): array
    {
        $this->loadMissing(['role.permissions', 'areas']);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'is_superadmin' => $this->is_superadmin,
            'tenant_id' => $this->tenant_id,
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch_id
                ? DB::table('gym_branches')->where('id', $this->branch_id)->value('name')
                : null,
            'role_slug' => $this->role?->slug,
            'role_name' => $this->role?->name,
            'permissions' => $this->role?->permissions
                ->map(fn ($permission) => $permission->module.'.'.$permission->action)
                ->values()
                ->all() ?? [],
            'area_ids' => $this->areas->pluck('id')->values()->all(),
            'phone' => $this->phone,
            'is_active' => $this->is_active,
            'cargo_id' => $this->cargo_id,
            'cost_per_hour' => $this->cost_per_hour,
        ];
    }

}
