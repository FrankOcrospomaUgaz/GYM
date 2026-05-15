<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformanceReview extends Model
{
    protected $fillable = [
        'user_id',
        'reviewer_id',
        'period',
        'score',
        'comments',
    ];

    /** @return BelongsTo<User, PerformanceReview> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, PerformanceReview> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
