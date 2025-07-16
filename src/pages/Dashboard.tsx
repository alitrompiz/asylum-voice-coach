import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Play, MessageCircle } from 'lucide-react';
import { UserScoreCard } from '@/components/UserScoreCard';
import persona1 from '@/assets/persona-1.png';
import persona2 from '@/assets/persona-2.png';
import persona3 from '@/assets/persona-3.png';
import persona4 from '@/assets/persona-4.png';

export default function Dashboard() {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const navigate = useNavigate();

  const personas = [
    { id: '1', name: 'Officer Chen', image: persona1, mood: 'Professional' },
    { id: '2', name: 'Officer Rodriguez', image: persona2, mood: 'Thorough' },
    { id: '3', name: 'Officer Johnson', image: persona3, mood: 'Friendly' },
    { id: '4', name: 'Officer Smith', image: persona4, mood: 'Formal' },
  ];

  const handleStartInterview = () => {
    navigate('/interview');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Interview Practice Dashboard</h1>
            <p className="text-muted-foreground">
              Prepare for your asylum interview with AI-powered practice sessions
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/profile')}>
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>
        </header>

        <div className="mb-8">
          <UserScoreCard />
        </div>

        {/* Select Your Interviewer */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Your Interviewer</CardTitle>
            <CardDescription>Choose the USCIS officer you'd like to practice with</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="flex gap-6 pb-4">
                {personas.map((persona) => (
                  <div 
                    key={persona.id} 
                    className="flex flex-col items-center min-w-[120px] cursor-pointer group"
                    onClick={() => setSelectedPersona(persona.id)}
                  >
                    <div className={`relative mb-3 ${selectedPersona === persona.id ? 'ring-2 ring-primary ring-offset-2' : ''} rounded-full overflow-hidden`}>
                      <img 
                        src={persona.image} 
                        alt={persona.name}
                        className="w-20 h-20 object-cover rounded-full group-hover:scale-105 transition-transform duration-200"
                      />
                      {selectedPersona === persona.id && (
                        <div className="absolute inset-0 bg-primary/10 rounded-full flex items-center justify-center">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">{persona.name}</p>
                      <p className="text-xs text-muted-foreground">{persona.mood}</p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant={selectedPersona === persona.id ? "default" : "outline"}
                        className="h-8 w-8 p-0"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Start Interview */}
        <Card>
          <CardHeader>
            <CardTitle>Ready to Practice?</CardTitle>
            <CardDescription>
              Start an AI-powered interview practice session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button size="lg" onClick={handleStartInterview}>
                <Play className="w-5 h-5 mr-2" />
                Start Interview
              </Button>
              <p className="text-sm text-muted-foreground">
                This will use your practice minutes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}