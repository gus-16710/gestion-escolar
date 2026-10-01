import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CheckboxListProps {
    idPrefix: string;
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    error?: string;
    /** Text shown for each option; the option value itself is what gets selected and sent. */
    renderLabel?: (option: string) => string;
}

export function CheckboxList({ idPrefix, label, options, selected, onChange, error, renderLabel = (option) => option }: CheckboxListProps) {
    const toggle = (option: string, checked: boolean) => {
        onChange(checked ? [...selected, option] : selected.filter((item) => item !== option));
    };

    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <div className="border-input grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                {options.map((option) => (
                    <div key={option} className="flex items-center gap-2">
                        <Checkbox
                            id={`${idPrefix}-${option}`}
                            checked={selected.includes(option)}
                            onCheckedChange={(checked) => toggle(option, checked === true)}
                        />
                        <Label htmlFor={`${idPrefix}-${option}`} className="font-normal">
                            {renderLabel(option)}
                        </Label>
                    </div>
                ))}
                {options.length === 0 && <p className="text-muted-foreground text-sm">No hay opciones disponibles.</p>}
            </div>
            <InputError message={error} />
        </div>
    );
}
