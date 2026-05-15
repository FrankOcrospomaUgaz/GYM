<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Area extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsToMany<User, Area> */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'area_user');
    }

    /** @return BelongsToMany<Client, Area> */
    public function clients(): BelongsToMany
    {
        return $this->belongsToMany(Client::class, 'client_area');
    }

    /** @return BelongsToMany<Project, Area> */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_area');
    }
}
