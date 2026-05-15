<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StatusCatalog extends Model
{
    protected $table = 'status_catalogs';

    protected $fillable = [
        'category',
        'code',
        'label',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
