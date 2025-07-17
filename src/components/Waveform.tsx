import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface WaveformProps {
  isActive: boolean;
  className?: string;
  intensity?: number;
}

export const Waveform = ({ isActive, className, intensity = 1 }: WaveformProps) => {
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    const generateBars = () => {
      const numBars = 20; // Reduced number of bars
      const newBars = Array.from({ length: numBars }, () => 
        isActive ? Math.max(30, Math.random() * 70 * intensity + 30) : 10
      );
      setBars(newBars);
    };

    generateBars();
    
    if (isActive) {
      const interval = setInterval(generateBars, 100); // Faster updates
      return () => clearInterval(interval);
    }
  }, [isActive, intensity]); // Added intensity to dependencies

  return (
    <div className={cn("flex items-center justify-center gap-0.5 h-16 transition-opacity", className)}>
      {bars.map((height, index) => (
        <div
          key={index}
          className={cn(
            "bg-white/70 rounded-full transition-all duration-100 ease-out",
            "w-0.5" // Thinner bars
          )}
          style={{
            height: `${height}%`,
            animationDelay: `${index * 0.02}s`,
          }}
        />
      ))}
    </div>
  );
};