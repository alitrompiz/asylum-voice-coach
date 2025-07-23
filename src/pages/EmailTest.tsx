
import EmailTestComponent from '@/components/EmailTestComponent';

export default function EmailTest() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Email Branding Test</h1>
          <p className="text-muted-foreground">
            Test the AsylumPrep branded email verification flow
          </p>
        </div>
        <EmailTestComponent />
      </div>
    </div>
  );
}
