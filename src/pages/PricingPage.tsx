import { useEffect, useState } from 'react';
import { getCreditPacks, getUserUsage, buyCredits } from '@/lib/api/payment';
import type { CreditPack, UserUsage } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Zap, Loader2, Check } from 'lucide-react';

export default function PricingPage() {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCreditPacks(), getUserUsage()]).then(([p, u]) => {
      setPacks(p);
      setUsage(u);
      setLoading(false);
    });
  }, []);

  const handleBuy = async (packId: string) => {
    setBuying(packId);
    const updated = await buyCredits(packId);
    setUsage(updated);
    setBuying(null);
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display font-bold text-3xl text-foreground mb-2">Mua Credit</h2>
        <p className="text-sm text-muted-foreground">Mua credit để phiên dịch video và luyện tập. Không cần đăng ký gói.</p>
        {usage && (
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-xs font-mono border border-border bg-card text-muted-foreground">
            <Zap className="w-3 h-3 text-primary" />
            {usage.creditsRemaining} credit còn lại · Đã dùng: {usage.creditsUsedTotal}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map(pack => (
          <div
            key={pack.id}
            className={`bg-card border rounded-lg p-5 flex flex-col relative ${
              pack.popular ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
            }`}
          >
            {pack.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-mono px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                PHỔ BIẾN
              </span>
            )}
            <div className="text-center mb-4">
              <p className="font-display font-bold text-3xl text-foreground">{pack.credits}</p>
              <p className="text-xs text-muted-foreground">credits</p>
            </div>
            <p className="text-center text-xl font-semibold text-foreground mb-1">
              {pack.currency}{pack.price}
            </p>
            <p className="text-center text-xs text-muted-foreground mb-4">
              ~{pack.currency}{(pack.price / pack.credits).toFixed(3)}/credit
            </p>
            <Button
              onClick={() => handleBuy(pack.id)}
              disabled={buying === pack.id}
              variant={pack.popular ? 'default' : 'outline'}
              className="w-full mt-auto gap-1"
            >
              {buying === pack.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Mua ngay
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
