import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAttorneys } from '@/hooks/useAttorneys';
import { useDebounce } from '@/hooks/useDebounce';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Error boundary component for attorney selector
const AttorneyErrorBoundary = ({ onRetry }: { onRetry: () => void }) => {
  return (
    <div className="p-4 border border-destructive/20 rounded-md bg-destructive/5">
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span>Error loading attorneys</span>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRetry}
        className="mt-2 h-7 text-xs"
      >
        Try again
      </Button>
    </div>
  );
};

export const AttorneySelector = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [hasError, setHasError] = useState(false);
  
  const { 
    attorneys, 
    selectedAttorney, 
    searchTerm, 
    setSearchTerm, 
    selectAttorney, 
    isSelecting,
    loading 
  } = useAttorneys();

  // Safe attorney list with proper filtering - no null children
  const safeAttorneys = useMemo(() => {
    const result = Array.isArray(attorneys) ? attorneys : [];
    // Filter out invalid items before mapping to avoid null children
    const validItems = result.filter(a => a && a.id && a.display_name && a.firm_name);
    
    return validItems;
  }, [attorneys]);

  const debouncedSearch = useDebounce((value: string) => {
    try {
      setSearchTerm(value);
      setHasError(false);
    } catch (error) {
      console.error('Attorney search error:', error);
      setHasError(true);
    }
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleSelect = (attorneyId: string) => {
    try {
      const attorney = safeAttorneys.find(a => a?.id === attorneyId);
      if (attorney && attorney.display_name && attorney.firm_name) {
        selectAttorney(attorneyId);
        setOpen(false);
        setHasError(false);
      }
    } catch (error) {
      console.error('Attorney selection error:', error);
      setHasError(true);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setSearchValue('');
    setSearchTerm('');
  };

  if (hasError) {
    return (
      <div className="space-y-2">
        <Label htmlFor="attorney">{t('profile.attorney_label')}</Label>
        <AttorneyErrorBoundary onRetry={handleRetry} />
      </div>
    );
  }

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
            disabled={isSelecting || loading}
          >
            {selectedAttorney ? 
              `${selectedAttorney.display_name} - ${selectedAttorney.firm_name}` : 
              loading ? 'Loading attorneys...' : t('profile.attorney_placeholder')
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
            <CommandList>
              <CommandEmpty>
                {loading ? 'Loading attorneys...' : 'No attorney found.'}
              </CommandEmpty>
              <CommandGroup>
                {safeAttorneys.map((attorney) => (
                  <CommandItem
                    key={attorney.id}
                    value={`${attorney.id} ${attorney.display_name} ${attorney.firm_name}`}
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
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};