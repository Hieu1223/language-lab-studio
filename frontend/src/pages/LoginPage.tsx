import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function LoginPage() {
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
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-primary-foreground font-bold text-3xl">日</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl text-foreground mb-2">NihonGo</h1>
          <p className="text-muted-foreground text-sm">Học tiếng Nhật cùng Duolingo phiên bản tiếng Việt</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tên đăng nhập</label>
            <Input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tên hiển thị (tùy chọn)</label>
              <Input
                type="text"
                placeholder="Nguyễn Văn A"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Mật khẩu</label>
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
            {isLoading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </Button>
        </form>

        {/* Toggle between login and register */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setUsername('');
                setPassword('');
                setDisplayName('');
              }}
              className="text-primary font-bold hover:underline"
            >
              {isLogin ? 'Đăng ký' : 'Đăng nhập'}
            </button>
          </p>
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Hoặc <a href="/landing" className="text-primary font-bold hover:underline">xem transcript công khai</a> mà không cần đăng nhập.
        </p>
      </div>
    </div>
  );
}
