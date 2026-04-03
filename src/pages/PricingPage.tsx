import { useEffect, useState } from 'react';
import { getPricingPlans, getUserUsage, subscribeToPlan } from '@/lib/api/payment';
import type { PricingPlan, UserUsage } from '@/lib/api/types';
import { PricingCard } from '@/components/pricing/PricingCard';

export default function PricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPricingPlans(), getUserUsage()]).then(([p, u]) => {
      setPlans(p);
      setUsage(u);
      setLoading(false);
    });
  }, []);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    const updated = await subscribeToPlan(planId);
    setUsage(updated);
    setSubscribing(null);
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display font-bold text-3xl text-foreground mb-2">Choose Your Plan</h2>
        <p className="text-sm text-muted-foreground">Unlock more transcriptions and features.</p>
        {usage && (
          <p className="text-xs font-mono text-muted-foreground mt-2">
            Current plan: <span className="text-primary uppercase">{usage.plan}</span>
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map(plan => (
          <PricingCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={usage?.plan === plan.id}
            isPopular={plan.id === 'pro'}
            subscribing={subscribing === plan.id}
            onSubscribe={() => handleSubscribe(plan.id)}
          />
        ))}
      </div>
    </div>
  );
}
