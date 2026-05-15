<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    protected $fillable = [
        'module',
        'action',
        'label',
    ];

    /** @return BelongsToMany<Role, Permission> */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }
}
