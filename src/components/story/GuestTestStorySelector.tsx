import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TestStory {
  id: string;
  title: string;
  category: string;
  country_origin: string;
  summary: string;
  full_story_text: string;
  display_order: number;
}

interface GuestTestStorySelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStorySelect: (story: TestStory) => void;
}

const categoryColors: Record<string, string> = {
  political: 'bg-red-500/10 text-red-700 border-red-200',
  race: 'bg-purple-500/10 text-purple-700 border-purple-200',
  religion: 'bg-blue-500/10 text-blue-700 border-blue-200',
  gender: 'bg-pink-500/10 text-pink-700 border-pink-200',
  nationality: 'bg-green-500/10 text-green-700 border-green-200',
  social_group: 'bg-orange-500/10 text-orange-700 border-orange-200',
};

export const GuestTestStorySelector = ({
  isOpen,
  onOpenChange,
  onStorySelect,
}: GuestTestStorySelectorProps) => {
  const { t } = useTranslation();
  const [expandedStory, setExpandedStory] = useState<string | null>(null);

  const { data: testStories, isLoading } = useQuery({
    queryKey: ['test-stories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_stories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as TestStory[];
    },
    enabled: isOpen,
  });

  const handleStorySelect = (story: TestStory) => {
    onStorySelect(story);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {t('test_stories.title', 'Choose a Practice Story')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t(
              'test_stories.guest_explanation',
              'These are realistic sample cases for practice. Regular users can upload their real I-589 form or write their own story.'
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {testStories?.map((story) => (
                <Card key={story.id} className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{story.title}</CardTitle>
                        <CardDescription className="mt-1">
                          <span className="font-medium">{story.country_origin}</span>
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className={categoryColors[story.category] || 'bg-muted'}
                      >
                        {t(
                          `test_stories.category_${story.category}`,
                          story.category.charAt(0).toUpperCase() + story.category.slice(1)
                        )}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{story.summary}</p>

                    <Collapsible
                      open={expandedStory === story.id}
                      onOpenChange={(open) => setExpandedStory(open ? story.id : null)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between">
                          {expandedStory === story.id
                            ? 'Hide Full Story'
                            : t('test_stories.view_full_story', 'Read Full Story')}
                          {expandedStory === story.id ? (
                            <ChevronUp className="h-4 w-4 ml-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-2" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3">
                        <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line">
                          {story.full_story_text}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Button
                      onClick={() => handleStorySelect(story)}
                      className="w-full"
                      size="lg"
                    >
                      {t('test_stories.select_story', 'Select This Story')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
