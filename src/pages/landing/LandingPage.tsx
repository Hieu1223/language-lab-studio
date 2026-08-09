import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Brain, Video, BookText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const { t } = useTranslation('common');
  const { t: ta } = useTranslation('auth');

  // `id` is a stable, non-translated React key so switching locale re-renders
  // the cards in place instead of remounting them.
  const features = [
    { id: 'transcription', icon: Video },
    { id: 'flashcard', icon: BookOpen },
    { id: 'manga', icon: BookText },
    { id: 'practice', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary overflow-hidden">
              <img src="/icon-512.png" alt={t('app.logoAlt')} className="w-full h-full object-cover" />
            </div>
            <h1 className="font-display font-bold text-lg text-foreground">{t('app.name')}</h1>
          </div>
          <Link to="/login">
            <Button size="sm" className="font-bold rounded-xl">{ta('login')}</Button>
          </Link>
        </div>
      </header>

      <section className="py-16 px-4 text-center">
        <h2 className="font-display font-extrabold text-4xl md:text-5xl text-foreground mb-4">
          {t('landing.heroPrefix')}<span className="text-primary">{t('landing.heroHighlight')}</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          {t('landing.subtitle')}
        </p>
        <Link to="/login">
          <Button size="lg" className="font-bold rounded-xl gap-2 text-base px-8">
            {t('landing.getStarted')} <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map(f => (
            <div key={f.id} className="bg-card border border-border rounded-2xl p-5 text-center hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">{t(`landing.features.${f.id}.title`)}</h3>
              <p className="text-xs text-muted-foreground">{t(`landing.features.${f.id}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
