<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Opportunity extends Model
{
    protected $fillable = [
        'client_id',
        'owner_user_id',
        'area_id',
        'title',
        'stage',
        'probability',
        'expected_amount',
        'expected_close',
        'next_followup_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'probability' => 'integer',
            'expected_amount' => 'decimal:2',
            'expected_close' => 'date',
            'next_followup_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Client, Opportunity> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<User, Opportunity> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /** @return BelongsTo<Area, Opportunity> */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }
}
