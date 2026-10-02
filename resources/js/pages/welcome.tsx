import { type AperturaPublica, type CursoPublico, type ImagenSitio, type PlantelPublico } from '@/components/welcome/comun';
import { BarraSuperior, Hero } from '@/components/welcome/portada';
import { Aperturas, Cierre, Oferta, PiePagina, Planteles, Ventajas, Verificar } from '@/components/welcome/secciones';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';

interface WelcomeProps {
    cursos: CursoPublico[];
    planteles: PlantelPublico[];
    aperturas: AperturaPublica[];
    cifras: { cursos: number; planteles: number; modulos: number; cupo_maximo: number | null };
    /** Number for "Pedir informes"; null while CICCIS_WHATSAPP isn't set (buttons then lead to the planteles). */
    whatsapp: string | null;
    /** public/images/sitio/portada.*; the emblem is shown while there's none. */
    portada: ImagenSitio | null;
}

/** The public site at "/" (WelcomeController). */
export default function Welcome({ cursos, planteles, aperturas, cifras, whatsapp, portada }: WelcomeProps) {
    const { auth } = usePage<SharedData>().props;
    const conSesion = Boolean(auth.user);

    return (
        <>
            <Head title="Cursos y capacitación">
                <meta
                    name="description"
                    content={`CICCIS: cursos de ${cursos.map((curso) => curso.nombre).join(', ')} en ${planteles.map((plantel) => plantel.nombre).join(' y ')}.`}
                />
            </Head>

            <div className="bg-background text-foreground min-h-svh scroll-smooth">
                <BarraSuperior conSesion={conSesion} />
                <main>
                    <Hero cursos={cursos} aperturas={aperturas} cifras={cifras} whatsapp={whatsapp} portada={portada} />
                    <Oferta cursos={cursos} whatsapp={whatsapp} />
                    <Ventajas cupoMaximo={cifras.cupo_maximo} />
                    <Aperturas aperturas={aperturas} whatsapp={whatsapp} />
                    <Planteles planteles={planteles} whatsapp={whatsapp} />
                    <Verificar />
                    <Cierre whatsapp={whatsapp} conSesion={conSesion} />
                </main>
                <PiePagina planteles={planteles} />
            </div>
        </>
    );
}
