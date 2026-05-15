<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TariffConfig extends Model
{
    protected $fillable = [
        'name',
        'rate_type',
        'amount',
        'currency_id',
        'area_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Currency, TariffConfig> */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    /** @return BelongsTo<Area, TariffConfig> */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }
}
