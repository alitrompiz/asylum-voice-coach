import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Clock, AlertTriangle, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SessionSetting {
  id: string;
  setting_key: string;
  setting_value: number;
  description: string;
}

export function SessionLimitsManager() {
  const [settings, setSettings] = useState<SessionSetting[]>([]);
  const [values, setValues] = useState({
    max_session_length_minutes: 30,
    inactivity_alert_seconds: 45,
    session_cutshort_threshold_seconds: 60
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('session_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;

      if (data && data.length > 0) {
        setSettings(data);
        const settingsMap = data.reduce((acc, setting) => ({
          ...acc,
          [setting.setting_key]: setting.setting_value
        }), {});
        setValues(prev => ({ ...prev, ...settingsMap }));
      } else {
        // Insert default settings if none exist
        await insertDefaultSettings();
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch session settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const insertDefaultSettings = async () => {
    try {
      const user = await supabase.auth.getUser();
      const defaultSettings = [
        {
          setting_key: 'max_session_length_minutes',
          setting_value: 30,
          description: 'Maximum session length in minutes',
          updated_by: user.data.user?.id
        },
        {
          setting_key: 'inactivity_alert_seconds',
          setting_value: 45,
          description: 'Inactivity alert threshold in seconds',
          updated_by: user.data.user?.id
        },
        {
          setting_key: 'session_cutshort_threshold_seconds',
          setting_value: 60,
          description: 'Session cut-short threshold in seconds (used for phrase selection)',
          updated_by: user.data.user?.id
        }
      ];

      const { error } = await supabase
        .from('session_settings')
        .insert(defaultSettings);

      if (error) throw error;

      await fetchSettings();
    } catch (error: any) {
      console.error('Error inserting default settings:', error);
      toast({
        title: "Error",
        description: "Failed to initialize default settings",
        variant: "destructive"
      });
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const user = await supabase.auth.getUser();
      const updates = Object.entries(values).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_by: user.data.user?.id
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('session_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      await fetchSettings();
      
      toast({
        title: "Success",
        description: "Session limits updated successfully",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save session limits",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setValues(prev => ({ ...prev, [key]: numValue }));
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Session Limits</h2>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Session Limits</h2>
        <p className="text-muted-foreground">
          Configure timing parameters for interview sessions
        </p>
      </div>

      <div className="grid gap-6">
        {/* Max Session Length */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Maximum Session Length
            </CardTitle>
            <CardDescription>
              The maximum duration allowed for an interview session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="max_session_length">Minutes</Label>
                  <Input
                    id="max_session_length"
                    type="number"
                    min="1"
                    max="120"
                    value={values.max_session_length_minutes}
                    onChange={(e) => handleValueChange('max_session_length_minutes', e.target.value)}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Current: {values.max_session_length_minutes} minutes
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inactivity Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Inactivity Alert Threshold
            </CardTitle>
            <CardDescription>
              Time of inactivity before showing an alert to the user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="inactivity_alert">Seconds</Label>
                  <Input
                    id="inactivity_alert"
                    type="number"
                    min="10"
                    max="300"
                    value={values.inactivity_alert_seconds}
                    onChange={(e) => handleValueChange('inactivity_alert_seconds', e.target.value)}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Current: {formatTime(values.inactivity_alert_seconds)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Cut-short Threshold */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Session Cut-short Threshold
            </CardTitle>
            <CardDescription>
              Sessions shorter than this duration will show "cut-short" phrases instead of "good" phrases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="cutshort_threshold">Seconds</Label>
                  <Input
                    id="cutshort_threshold"
                    type="number"
                    min="10"
                    max="3600"
                    value={values.session_cutshort_threshold_seconds}
                    onChange={(e) => handleValueChange('session_cutshort_threshold_seconds', e.target.value)}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Current: {formatTime(values.session_cutshort_threshold_seconds)}
                </div>
              </div>
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                <strong>How it works:</strong> Sessions lasting less than {formatTime(values.session_cutshort_threshold_seconds)} will 
                randomly show a phrase from the "Cut-short Phrases" list. Longer sessions will show a "Good Phrases" message.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveSettings}
          disabled={isSaving}
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Impact Notice */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Changes take effect immediately
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                New settings will apply to all sessions started after saving. Currently active sessions will not be affected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}