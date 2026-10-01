<?php

namespace Database\Seeders;

use App\Models\Curso;
use Illuminate\Database\Seeder;

class CursoModuloSeeder extends Seeder
{
    /** Weeks per month, the same factor the curso form uses (SEMANAS_POR_MES). */
    private const SEMANAS_POR_MES = 4.345;

    /**
     * Seed the study plan of each curso, keyed by curso clave. Cursos not listed here keep whatever plan was captured from the screen.
     *
     * Lengths are the official ones, in weeks or in months. Months are converted to weeks by rounding where each module ends, counted
     * from the start of the curso, so the modules add up to the curso's own duration (18 months = 78 weeks) and each one ends on its month mark.
     */
    public function run(): void
    {
        $planes = [
            'EST' => ['en' => 'meses', 'modulos' => [
                ['Maquillaje Profesional y Diseño de Cejas', 2, 'Introducción al maquillaje profesional, preparación de la piel, visagismo, diseño y perfilado de cejas, maquillaje social, artístico y de fantasía, así como técnicas básicas de efectos especiales.'],
                ['Tratamientos Capilares y Peinados', 2, 'Conocimiento de la estructura y tipos de cabello, diagnóstico capilar, lavado profesional, secado, cepillado, planchado, ondulado, rizado, trenzas y elaboración de peinados básicos y sociales.'],
                ['Aplicación de Uñas Acrílicas', 2, 'Preparación de la uña natural, higiene y bioseguridad, aplicación de acrílico, construcción, limado, estructura, mantenimiento, decoración y técnicas básicas de diseño.'],
                ['Permacología y Keratinas', 2.5, 'Fundamentos de química capilar, diagnóstico, permanentes, alaciados, keratinas y otros procesos de transformación de la fibra capilar, incluyendo preparación, aplicación y cuidados posteriores.'],
                ['Cortes Clásicos y Barbería Profesional', 6.5, 'Dominio progresivo de herramientas, secciones, líneas guía, cortes clásicos, técnicas con máquina y tijera, degradados, fades, diseños y diferentes estilos masculinos y femeninos.'],
                ['Colorimetría Profesional', 3, 'Teoría del color, diagnóstico, decoloración, aplicación de color, neutralización, correcciones y técnicas de iluminación como mechas, balayage y otras técnicas de coloración.'],
            ]],
            'BAR' => ['en' => 'semanas', 'modulos' => [
                ['Fundamentos de Barbería', 8, 'Introducción profesional, higiene, bioseguridad, cabello, crecimiento, morfología, secciones, herramientas, mantenimiento, postura y manejo básico de máquina.'],
                ['Técnicas Base de Corte', 8, 'Dominio de máquina y tijera, cortes uniformes, líneas guía, máquina sobre peine, tijera sobre peine, conexiones y cortes clásicos masculinos.'],
                ['Degradados / Fades', 9, 'Introducción y perfeccionamiento de los degradados: Fade, Low Fade, Mid Fade, Drop Fade, Taper Fade, Burst Fade, Fade con textura y práctica de perfeccionamiento.'],
                ['Cortes Modernos, Textura y Diseño', 4, 'Aplicación de fades, conexiones y textura en Mullet, Burst Fade Mullet, Quiff, Side Part, Bro Flow, Shag, Undercut y Buzz Cut.'],
                ['Barba, Afeitado y Diseño Masculino', 3, 'Diseño y perfilado de barba, simetría, preparación de piel, afeitado clásico y realización de servicios masculinos completos.'],
                ['Atención al Cliente y Emprendimiento', 3, 'Atención profesional, diagnóstico, comunicación, servicio, marca personal, costos, precios, organización y bases para emprender en barbería.'],
            ]],
            'INF' => ['en' => 'semanas', 'modulos' => [
                ['Introducción a la Informática y Ambiente Windows', 4, 'Conceptos básicos de computación, partes de una computadora, sistema operativo Windows, escritorio, ventanas, configuración, usuarios y personalización del entorno.'],
                ['Administración de Archivos y Carpetas', 3, 'Creación, organización, búsqueda, copia, movimiento y eliminación de archivos y carpetas. Uso de memorias USB, almacenamiento y buenas prácticas para organizar información.'],
                ['Microsoft Word — Procesador de Textos', 8, 'Creación y edición de documentos, formato de texto, tablas, imágenes, encabezados, pies de página, estilos, documentos administrativos, cartas, oficios, currículum y documentos profesionales.'],
                ['Microsoft Excel — Hojas de Cálculo', 10, 'Introducción a hojas de cálculo, formatos, fórmulas, funciones, tablas, filtros, gráficos, operaciones administrativas, control de gastos, inventarios y elaboración de reportes.'],
                ['Microsoft PowerPoint — Presentaciones', 5, 'Creación de presentaciones profesionales, diseño de diapositivas, imágenes, gráficos, tablas, animaciones, transiciones y exposición de información.'],
                ['Microsoft Access — Bases de Datos', 6, 'Conceptos de bases de datos, creación de tablas, campos y registros, relaciones, consultas, formularios y reportes. Aplicación a clientes, productos, inventarios y registros administrativos.'],
                ['Internet y Navegación Web', 3, 'Uso profesional de Internet, navegadores, búsquedas eficientes, descarga de archivos, formularios en línea, almacenamiento en la nube, seguridad y prevención de riesgos digitales.'],
                ['Correo Electrónico y Comunicación Digital', 3, 'Creación y administración de correo electrónico, envío de mensajes, archivos adjuntos, contactos, carpetas, firmas, CC/CCO y buenas prácticas de comunicación profesional.'],
                ['Herramientas Digitales para la Administración', 5, 'Uso de herramientas digitales para productividad, almacenamiento en la nube, calendarios, documentos colaborativos, videollamadas, formularios y organización de actividades administrativas.'],
                ['Seguridad Informática y Buenas Prácticas Digitales', 2, 'Contraseñas seguras, privacidad, respaldos, malware, phishing, protección de información y uso responsable de dispositivos y servicios digitales.'],
                ['Proyecto Integrador de Informática Administrativa', 3, 'Desarrollo de un proyecto administrativo completo utilizando Word, Excel, PowerPoint, Access, correo electrónico e Internet, simulando las actividades de una oficina.'],
            ]],
            'ENF' => ['en' => 'semanas', 'modulos' => [
                ['Introducción a la Enfermería y Ética Profesional', 4, 'Conceptos fundamentales de enfermería, funciones del auxiliar, ética, responsabilidad profesional, trato digno, derechos del paciente y trabajo en equipo.'],
                ['Anatomía y Fisiología Humana', 8, 'Estudio de los principales sistemas y órganos del cuerpo humano, su estructura, funcionamiento y relación con el cuidado de enfermería.'],
                ['Higiene, Bioseguridad y Control de Infecciones', 6, 'Higiene personal y del paciente, lavado de manos, uso de equipo de protección, prevención de infecciones, manejo de residuos y medidas de bioseguridad.'],
                ['Fundamentos y Técnicas de Enfermería', 10, 'Principios básicos del cuidado, valoración del paciente, signos vitales, posiciones, movilización, comodidad, higiene del paciente y técnicas fundamentales de enfermería.'],
                ['Nutrición y Alimentación del Paciente', 4, 'Principios de nutrición, tipos de alimentación, dietas hospitalarias, hidratación, apoyo durante la alimentación y cuidados relacionados con la nutrición.'],
                ['Farmacología Básica y Administración de Medicamentos', 8, 'Conceptos básicos de medicamentos, vías de administración, conservación, identificación, seguridad en la administración y prevención de errores.'],
                ['Primeros Auxilios y Atención de Urgencias', 7, 'Evaluación inicial, primeros auxilios, heridas, hemorragias, quemaduras, fracturas, intoxicaciones, emergencias y principios de reanimación.'],
                ['Enfermería Médico-Quirúrgica', 8, 'Cuidados básicos del paciente con enfermedades frecuentes, preparación para procedimientos, cuidados preoperatorios y postoperatorios y recuperación.'],
                ['Enfermería Materno-Infantil', 7, 'Embarazo, parto y puerperio, cuidados básicos de la madre, recién nacido, crecimiento y desarrollo infantil y atención preventiva.'],
                ['Enfermería Geriátrica', 4, 'Atención integral del adulto mayor, higiene, movilidad, alimentación, prevención de caídas, cuidados básicos y acompañamiento.'],
                ['Salud Comunitaria y Educación para la Salud', 4, 'Prevención de enfermedades, promoción de la salud, vacunación, higiene, educación sanitaria y participación en actividades comunitarias.'],
                ['Salud Mental y Atención Humanizada', 3, 'Comunicación con el paciente, empatía, escucha activa, aspectos básicos de salud mental, manejo de situaciones difíciles y atención humanizada.'],
                ['Registros, Documentación y Trabajo Administrativo de Enfermería', 2, 'Expediente clínico, notas y registros de enfermería, manejo de información, comunicación entre profesionales y organización del trabajo.'],
                ['Prácticas Clínicas e Integración Profesional', 3, 'Integración de conocimientos mediante prácticas supervisadas, aplicación de procedimientos, trabajo en equipo, atención al paciente y evaluación final.'],
            ]],
            'ING' => ['en' => 'semanas', 'modulos' => [
                ['Fundamentos del Inglés', 5, 'Introducción al idioma, alfabeto, pronunciación, saludos, presentaciones, números, colores, días, meses y expresiones básicas.'],
                ['Inglés Básico I — Comunicación Cotidiana', 6, 'Pronombres, verbo to be, artículos, sustantivos, adjetivos, posesivos y construcción de oraciones sencillas. Conversaciones de situaciones cotidianas.'],
                ['Inglés Básico II — Vida Diaria', 6, 'Presente simple, rutinas, horarios, actividades, gustos, preferencias, preguntas y respuestas. Desarrollo de vocabulario cotidiano.'],
                ['Inglés Básico III — Comunicación Práctica', 6, 'Presente continuo, pasado simple, futuro, expresiones de tiempo, lugares, compras, transporte, viajes y situaciones frecuentes.'],
                ['Comprensión Auditiva y Conversación Básica', 5, 'Práctica intensiva de listening y speaking. Comprensión de diálogos, instrucciones y conversaciones sencillas. Pronunciación y fluidez básica.'],
                ['Inglés Pre-Intermedio — Estructuras Gramaticales', 7, 'Revisión y ampliación de tiempos verbales, comparativos, superlativos, modales, cuantificadores, preposiciones y estructuras de mayor complejidad.'],
                ['Inglés Intermedio I — Comunicación y Fluidez', 7, 'Conversaciones más extensas, descripción de experiencias, opiniones, planes, situaciones hipotéticas y resolución de situaciones comunicativas.'],
                ['Inglés Intermedio II — Lectura y Escritura', 6, 'Comprensión de textos, identificación de ideas principales, redacción de párrafos, correos, mensajes, descripciones y textos académicos sencillos.'],
                ['Inglés para Uso Académico', 5, 'Vocabulario académico, comprensión de textos, búsqueda y presentación de información, elaboración de exposiciones y participación en actividades académicas.'],
                ['Inglés para Uso Laboral', 5, 'Vocabulario profesional, entrevistas de trabajo, currículum, llamadas, reuniones, instrucciones, atención al cliente y comunicación en ambientes laborales.'],
                ['Herramientas de Comunicación en Inglés', 4, 'Presentaciones, conversaciones profesionales, correos electrónicos, comunicación digital, reuniones virtuales y situaciones laborales reales.'],
                ['Proyecto Integrador y Evaluación Final', 3, 'Integración de las cuatro habilidades: listening, speaking, reading y writing. Presentación final y evaluación práctica del nivel alcanzado.'],
            ]],
        ];

        foreach ($planes as $clave => ['en' => $unidad, 'modulos' => $modulos]) {
            $curso = Curso::where('clave', $clave)->firstOrFail();
            $acumulado = 0;
            $semanasHastaAqui = 0;

            $curso->modulos()->where('orden', '>', count($modulos))->delete();

            foreach ($modulos as $indice => [$nombre, $duracion, $descripcion]) {
                $acumulado += $duracion;
                $finEnSemanas = (int) round($unidad === 'meses' ? $acumulado * self::SEMANAS_POR_MES : $acumulado);

                $curso->modulos()->updateOrCreate(['orden' => $indice + 1], [
                    'nombre' => $nombre,
                    'descripcion' => $descripcion,
                    'duracion_semanas' => $finEnSemanas - $semanasHastaAqui,
                ]);

                $semanasHastaAqui = $finEnSemanas;
            }
        }
    }
}
