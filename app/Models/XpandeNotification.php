<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class XpandeNotification extends Model
{
    protected $table = 'xpande_notifications';

    protected $fillable = [
        'user_id',
        'title',
        'body',
        'severity',
        'read_at',
        'related_type',
        'related_id',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, XpandeNotification> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
