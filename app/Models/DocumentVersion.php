<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentVersion extends Model
{
    protected $fillable = [
        'document_id',
        'version',
        'path',
        'user_id',
        'note',
    ];

    /** @return BelongsTo<Document, DocumentVersion> */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /** @return BelongsTo<User, DocumentVersion> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
