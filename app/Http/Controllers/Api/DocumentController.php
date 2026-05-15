<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Document::query()->with(['client:id,legal_name', 'project:id,name', 'area:id,name', 'uploader:id,name']);
        AreaVisibility::applyDocumentScope($q, $request->user());

        if ($request->filled('doc_type')) {
            $q->where('doc_type', $request->input('doc_type'));
        }

        return response()->json($q->orderByDesc('id')->paginate(30));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:15360'],
            'title' => ['required', 'string', 'max:255'],
            'doc_type' => ['required', 'string', 'max:64'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
        ]);

        $path = $data['file']->store('xpande_documents', 'public');
        $doc = Document::query()->create([
            'client_id' => $data['client_id'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'area_id' => $data['area_id'] ?? null,
            'doc_type' => $data['doc_type'],
            'title' => $data['title'],
            'path' => $path,
            'uploaded_by' => $request->user()?->id,
            'version' => 1,
        ]);

        DocumentVersion::query()->create([
            'document_id' => $doc->id,
            'version' => 1,
            'path' => $path,
            'user_id' => $request->user()?->id,
            'note' => 'Alta inicial',
        ]);

        return response()->json($doc, 201);
    }

    public function addVersion(Request $request, Document $document): JsonResponse
    {
        $this->assertDoc($request, $document);
        $data = $request->validate([
            'file' => ['required', 'file', 'max:15360'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        $path = $data['file']->store('xpande_documents', 'public');

        $next = (int) $document->version + 1;
        DocumentVersion::query()->create([
            'document_id' => $document->id,
            'version' => $next,
            'path' => $path,
            'user_id' => $request->user()?->id,
            'note' => $data['note'] ?? null,
        ]);
        $document->update(['path' => $path, 'version' => $next]);

        return response()->json($document->fresh()->load('versions'));
    }

    public function destroy(Request $request, Document $document): JsonResponse
    {
        $this->assertDoc($request, $document);
        if (Storage::disk('public')->exists($document->path)) {
            Storage::disk('public')->delete($document->path);
        }
        $document->versions()->delete();
        $document->delete();

        return response()->json(null, 204);
    }

    private function assertDoc(Request $request, Document $document): void
    {
        $q = Document::query()->whereKey($document->id);
        AreaVisibility::applyDocumentScope($q, $request->user());
        if (! $q->exists()) {
            abort(404);
        }
    }
}
