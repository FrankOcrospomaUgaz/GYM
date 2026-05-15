<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    protected $fillable = [
        'user_id',
        'project_id',
        'client_id',
        'area_id',
        'work_date',
        'started_at',
        'ended_at',
        'hours',
        'description',
        'billable',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'work_date' => 'date',
            'hours' => 'decimal:3',
            'billable' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, TimeEntry> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Project, TimeEntry> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** @return BelongsTo<Client, TimeEntry> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<Area, TimeEntry> */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }
}
