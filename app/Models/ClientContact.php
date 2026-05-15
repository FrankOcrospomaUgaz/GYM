<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientContact extends Model
{
    protected $fillable = [
        'client_id',
        'name',
        'position',
        'phone',
        'email',
        'area_id',
    ];

    /** @return BelongsTo<Client, ClientContact> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<Area, ClientContact> */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }
}
