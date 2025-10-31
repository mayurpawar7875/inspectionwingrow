import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, CheckCircle, Smartphone, ArrowLeft } from 'lucide-react';

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                {isInstalled ? (
                  <CheckCircle className="h-12 w-12 text-success" />
                ) : (
                  <Smartphone className="h-12 w-12 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isInstalled ? 'App Installed!' : 'Install StallSnap'}
            </CardTitle>
            <CardDescription>
              {isInstalled 
                ? 'You can now use the app from your home screen' 
                : 'Add this app to your home screen for quick access'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isInstalled ? (
              <div className="bg-success/10 text-success-foreground p-4 rounded-lg text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Successfully installed!</p>
                <p className="text-sm mt-1">You can find the app on your home screen</p>
              </div>
            ) : (
              <>
                {isInstallable ? (
                  <Button 
                    onClick={handleInstallClick} 
                    size="lg" 
                    className="w-full"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Install App
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Install Instructions</h3>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium">On iPhone/iPad:</p>
                          <ol className="list-decimal ml-4 mt-1 space-y-1">
                            <li>Tap the Share button in Safari</li>
                            <li>Scroll down and tap "Add to Home Screen"</li>
                            <li>Tap "Add" in the top right</li>
                          </ol>
                        </div>
                        <div>
                          <p className="font-medium">On Android:</p>
                          <ol className="list-decimal ml-4 mt-1 space-y-1">
                            <li>Tap the menu (three dots) in your browser</li>
                            <li>Tap "Add to Home screen" or "Install app"</li>
                            <li>Follow the prompts to install</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-semibold">Benefits of Installing:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                      <span>Quick access from your home screen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                      <span>Works offline with cached data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                      <span>Faster loading times</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-success flex-shrink-0" />
                      <span>Full-screen experience</span>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
