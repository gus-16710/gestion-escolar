import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

const EMBLEMA = 'url(/images/logo-ciccis-emblema.png)';

/**
 * The CICCIS emblem (gear, star of life and leaf), cleaned from public/images/logo_ciccis.png.
 * It is applied as a mask over the current text color, so `text-*` classes color it and it works
 * on light and dark backgrounds alike.
 */
export default function AppLogoIcon({ className, style, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <span
            role="img"
            aria-label="CICCIS"
            {...props}
            className={cn('inline-block aspect-square shrink-0 bg-current', className)}
            style={{
                maskImage: EMBLEMA,
                WebkitMaskImage: EMBLEMA,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
                ...style,
            }}
        />
    );
}
