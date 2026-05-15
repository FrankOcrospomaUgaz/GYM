<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
    ];

    /** @return HasMany<User, Role> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @return BelongsToMany<Permission, Role> */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }
}
