import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function LoginPage() {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password, displayName);
      }
      navigate('/youtube');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('authFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-primary overflow-hidden mx-auto mb-4 shadow-lg">
              <img src="/icon-512.png" alt={tc('app.logoAlt')} className="w-full h-full object-cover" />
            </div>
          <h1 className="font-display font-extrabold text-3xl text-foreground mb-2">{tc('app.name')}</h1>
          <p className="text-muted-foreground text-sm">{t('tagline')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('usernameLabel')}</label>
            <Input
              type="text"
              placeholder={t('usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('displayNameLabel')}</label>
              <Input
                type="text"
                placeholder={t('displayNamePlaceholder')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('passwordLabel')}</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-xl font-bold text-base"
            disabled={isLoading || !username || !password}
          >
            {isLoading ? t('submitting') : isLogin ? t('login') : t('register')}
          </Button>
        </form>

        {/* Toggle between login and register */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            {isLogin ? t('noAccount') : t('hasAccount')}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setUsername('');
                setPassword('');
                setDisplayName('');
              }}
              className="text-primary font-bold hover:underline"
            >
              {isLogin ? t('register') : t('login')}
            </button>
          </p>
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          <Trans t={t} i18nKey="publicHint">
            Hoặc <a href="/landing" className="text-primary font-bold hover:underline">xem transcript công khai</a> mà không cần đăng nhập.
          </Trans>
        </p>
      </div>
    </div>
  );
}
