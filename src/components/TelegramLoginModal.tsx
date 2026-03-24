import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2 } from 'lucide-react';
import { bridgesApi } from '@/api/bridges';
import { toast } from 'sonner';

interface TelegramLoginModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function TelegramLoginModal({ open, onOpenChange, onSuccess }: TelegramLoginModalProps) {
    const [step, setStep] = useState<'phone' | 'code' | 'password'>('phone');
    const [loading, setLoading] = useState(false);

    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [phoneCodeHash, setPhoneCodeHash] = useState('');

    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await bridgesApi.requestTelegramCode(phone);
            if (res.status === 'success' && res.phone_code_hash) {
                setPhoneCodeHash(res.phone_code_hash);
                setStep('code');
                toast.success("Code sent to your Telegram app/phone");
            } else if (res.status === 'already_connected') {
                toast.success("Already connected!");
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(res.message || "Failed to send code");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to request code");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await bridgesApi.verifyTelegramCode(phone, code, phoneCodeHash, password || undefined);

            if (res.status === 'success') {
                toast.success("Successfully connected to Telegram!");
                onSuccess();
                onOpenChange(false);
            } else if (res.status === 'needs_password') {
                setStep('password');
                toast.info("Two-step verification enabled. Please enter your password.");
            } else {
                toast.error("Verification failed");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to verify code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Connect Telegram</DialogTitle>
                    <DialogDescription>
                        {step === 'phone' && "Enter your phone number in international format (e.g., +123456789)."}
                        {step === 'code' && "Enter the code sent to your Telegram app."}
                        {step === 'password' && "Enter your Two-Step Verification password."}
                    </DialogDescription>
                </DialogHeader>

                {step === 'phone' && (
                    <form onSubmit={handleRequestCode} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                placeholder="+1234567890"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Send Code
                        </Button>
                    </form>
                )}

                {(step === 'code' || step === 'password') && (
                    <form onSubmit={handleVerifyCode} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            {step === 'code' ? (
                                <>
                                    <Label htmlFor="code">Verification Code</Label>
                                    <Input
                                        id="code"
                                        placeholder="12345"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        required
                                    />
                                </>
                            ) : (
                                <>
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Your 2FA Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {step === 'code' ? 'Verify Code' : 'Unlock & Connect'}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
