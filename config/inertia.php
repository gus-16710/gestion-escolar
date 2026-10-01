<?php

/*
| Only what differs from inertia-laravel's defaults (the rest is merged from the package): the pages
| live in resources/js/pages, lowercase. The default "js/Pages" only works on Windows, whose file
| system ignores case; on Linux (CI, the server) assertInertia() couldn't find any page.
*/

return [

    'page_paths' => [
        resource_path('js/pages'),
    ],

    'testing' => [

        'ensure_pages_exist' => true,

        'page_paths' => [
            resource_path('js/pages'),
        ],

        'page_extensions' => [
            'js',
            'jsx',
            'svelte',
            'ts',
            'tsx',
            'vue',
        ],

    ],

];
