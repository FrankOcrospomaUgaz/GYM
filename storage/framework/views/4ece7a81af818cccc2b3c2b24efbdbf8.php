<!doctype html>
<html lang="es">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>" />
        <title>GymPro GO · Gestión de Gimnasio</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
            rel="stylesheet"
        />
        <?php echo app('Illuminate\Foundation\Vite')(['resources/css/app.css', 'resources/js/main.tsx']); ?>
    </head>
    <body>
        <div id="root"></div>
        <script>
            window.__APEX__ = <?php echo json_encode($metrics, 15, 512) ?>;
            window.__AUTH__ = <?php echo json_encode($authUser, 15, 512) ?>;
        </script>
    </body>
</html>
<?php /**PATH C:\xampp\htdocs\GYM\resources\views\apex.blade.php ENDPATH**/ ?>