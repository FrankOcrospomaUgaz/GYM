<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = [
        'legal_name',
        'trade_name',
        'ruc',
        'address',
        'phone',
        'email',
        'sector',
        'company_size',
        'client_type',
        'industry',
        'pipeline_stage',
        'is_active',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsToMany<Area, Client> */
    public function areas(): BelongsToMany
    {
        return $this->belongsToMany(Area::class, 'client_area');
    }

    /** @return HasMany<ClientContact, Client> */
    public function contacts(): HasMany
    {
        return $this->hasMany(ClientContact::class);
    }

    /** @return HasMany<Project, Client> */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /** @return HasMany<CrmActivity, Client> */
    public function crmActivities(): HasMany
    {
        return $this->hasMany(CrmActivity::class);
    }

    /** @return HasMany<Opportunity, Client> */
    public function opportunities(): HasMany
    {
        return $this->hasMany(Opportunity::class);
    }

    /** @return HasMany<Quotation, Client> */
    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }
}
