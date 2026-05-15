<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class IntegrationStubController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'sunat_electronic_billing' => ['estado' => 'planificado', 'nota' => 'Conexión API SUNAT pendiente de credenciales.'],
            'excel_export' => ['estado' => 'disponible', 'nota' => 'Use exportación CSV desde listas o instale maatwebsite/excel.'],
            'pdf_export' => ['estado' => 'disponible', 'nota' => 'Use impresión del navegador o dompdf en backend.'],
            'power_bi' => ['estado' => 'planificado', 'nota' => 'Conector REST hacia estos endpoints de reportes.'],
            'email' => ['estado' => 'planificado', 'nota' => 'Laravel Mail + colas.'],
            'whatsapp' => ['estado' => 'planificado', 'nota' => 'API Business / proveedor tercero.'],
            'crm_externo' => ['estado' => 'planificado', 'nota' => 'Webhooks o sincronización por lotes.'],
            'google_drive' => ['estado' => 'planificado', 'nota' => 'Google Drive API para copia de documentos.'],
        ]);
    }
}
