import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bridgesApi } from '@/api/bridges';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function GmailCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (processedRef.current) return;
    processedRef.current = true;

    if (error) {
      toast.error(`Gmail connection denied: ${error}`);
      navigate('/connections');
      return;
    }

    if (!code) {
      toast.error("No authorization code found.");
      navigate('/connections');
      return;
    }

    const exchange = async () => {
      try {
        await bridgesApi.exchangeGmailCode(code);
        toast.success("Gmail connected successfully!");
      } catch (e: any) {
        console.error(e);
        toast.error(e.message || "Failed to connect Gmail.");
      } finally {
        navigate('/connections');
      }
    };

    exchange();
  }, [searchParams, navigate]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h2 className="text-xl font-semibold">Connecting Gmail...</h2>
    </div>
  );
}
