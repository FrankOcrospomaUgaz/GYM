<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    protected $fillable = [
        'client_id',
        'name',
        'service_type',
        'start_date',
        'end_estimated',
        'end_actual',
        'status',
        'budget',
        'lead_user_id',
        'description',
        'objectives',
        'deliverables',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_estimated' => 'date',
            'end_actual' => 'date',
            'budget' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Client, Project> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<User, Project> */
    public function leadUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_user_id');
    }

    /** @return BelongsToMany<Area, Project> */
    public function areas(): BelongsToMany
    {
        return $this->belongsToMany(Area::class, 'project_area');
    }

    /** @return BelongsToMany<User, Project> */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_user');
    }

    /** @return HasMany<Income, Project> */
    public function incomes(): HasMany
    {
        return $this->hasMany(Income::class);
    }

    /** @return HasMany<Expense, Project> */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /** @return HasMany<TimeEntry, Project> */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }
}
