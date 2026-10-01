import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationProps {
    links: PaginationLink[];
}

export function Pagination({ links }: PaginationProps) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <div className="flex items-center justify-center gap-1">
            {links.map((link, index) => {
                // Laravel always puts "previous" first and "next" last; checking the position keeps this independent of the locale.
                const isPrev = index === 0;
                const isNext = index === links.length - 1;
                const content = isPrev ? <ChevronLeft className="size-4" /> : isNext ? <ChevronRight className="size-4" /> : link.label;

                if (!link.url) {
                    return (
                        <span key={index} className="text-muted-foreground px-3 py-1.5 text-sm">
                            {content}
                        </span>
                    );
                }

                return (
                    <Button key={index} variant={link.active ? 'default' : 'outline'} size="sm" asChild>
                        <Link href={link.url} preserveScroll preserveState>
                            {content}
                        </Link>
                    </Button>
                );
            })}
        </div>
    );
}
