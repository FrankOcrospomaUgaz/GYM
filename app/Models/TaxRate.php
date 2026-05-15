<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxRate extends Model
{
    protected $fillable = [
        'name',
        'rate_percent',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'rate_percent' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }
}
