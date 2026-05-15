<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmActivity extends Model
{
    protected $fillable = [
        'client_id',
        'user_id',
        'type',
        'subject',
        'body',
        'occurred_at',
        'next_followup_at',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'next_followup_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Client, CrmActivity> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<User, CrmActivity> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
