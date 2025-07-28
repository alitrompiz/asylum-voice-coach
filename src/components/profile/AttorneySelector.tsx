import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAttorneys } from '@/hooks/useAttorneys';
import { useDebounce } from '@/hooks/useDebounce';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AttorneySelector = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { 
    attorneys, 
    selectedAttorney, 
    searchTerm, 
    setSearchTerm, 
    selectAttorney, 
    isSelecting 
  } = useAttorneys();

  const debouncedSearch = useDebounce((value: string) => {
    setSearchTerm(value);
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleSelect = (attorneyId: string) => {
    const attorney = attorneys?.find(a => a.id === attorneyId);
    if (attorney) {
      selectAttorney(attorneyId);
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="attorney">{t('profile.attorney_label')}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isSelecting}
          >
            {selectedAttorney ? 
              `${selectedAttorney.display_name} - ${selectedAttorney.firm_name}` : 
              t('profile.attorney_placeholder')
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput 
              placeholder={t('profile.attorney_placeholder')}
              value={searchValue}
              onValueChange={handleSearchChange}
            />
            <CommandEmpty>No attorney found.</CommandEmpty>
            <CommandGroup>
              {attorneys && attorneys.length > 0 ? (
                attorneys.map((attorney) => (
                  <CommandItem
                    key={attorney.id}
                    value={attorney.id}
                    onSelect={() => handleSelect(attorney.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedAttorney?.id === attorney.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <div className="font-medium">{attorney.display_name}</div>
                      <div className="text-sm text-muted-foreground">{attorney.firm_name}</div>
                    </div>
                  </CommandItem>
                ))
              ) : null}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};