<?php

return [

    /*
    | WhatsApp number for "Pedir informes" on the public site: digits with country code, e.g.
    | 5212281234567. While empty, those buttons point to the planteles section instead.
    */
    'whatsapp' => preg_replace('/\D/', '', (string) env('CICCIS_WHATSAPP', '')),

];
