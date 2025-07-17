import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface WaveformProps {
  isActive: boolean;
  className?: string;
  intensity?: number; // 0-1 scale for intensity
}

export const Waveform = ({ isActive, className, intensity = 1 }: WaveformProps) => {
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    const generateBars = () => {
        const numBars = 40;
        const newBars = Array.from({ length: numBars }, () => 
          isActive ? (Math.random() * 80 + 20) * intensity : 20
        );
      setBars(newBars);
    };

    generateBars();
    
    if (isActive) {
      const interval = setInterval(generateBars, 150);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  return (
    <div className={cn("flex items-center justify-center gap-1 h-16", className)}>
      {bars.map((height, index) => (
        <div
          key={index}
          className={cn(
            "bg-white/70 rounded-full transition-all duration-150 ease-out",
            "w-1"
          )}
          style={{
            height: `${height}%`,
            animationDelay: `${index * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
};