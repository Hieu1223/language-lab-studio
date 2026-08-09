import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor, RotateCcw, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { RangeSlider } from '@/components/ui/range-slider';
import { Slider } from '@/components/ui/slider';
import {
  getTranscriptionSettings,
  setTranscriptionSettings,
  getMangaSettings,
  setMangaSettings,
  clearAllSettings,
  type TranscriptionSettings,
  type MangaSettings,
  type HighlightMode,
  type ViewerLayout,
  type TranscriptionMode,
} from '@/lib/settings-storage';
import {
  getStoredTheme,
  setTheme as applyAndSetTheme,
  type Theme,
} from '@/lib/theme';
import { changeLocale, getLocale, type Locale } from '@/i18n';

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [locale, setLocaleState] = useState<Locale>(() => getLocale());
  const [trans, setTransState] = useState<TranscriptionSettings>(() =>
    getTranscriptionSettings(),
  );
  const [manga, setMangaState] = useState<MangaSettings>(() => getMangaSettings());

  const updateTrans = (patch: Partial<TranscriptionSettings>) => {
    setTransState((prev) => {
      const next = { ...prev, ...patch };
      setTranscriptionSettings(next);
      return next;
    });
  };
  const updateManga = (patch: Partial<MangaSettings>) => {
    setMangaState((prev) => {
      const next = { ...prev, ...patch };
      setMangaSettings(next);
      return next;
    });
  };
  const updateTheme = (next: Theme) => {
    setThemeState(next);
    applyAndSetTheme(next);
  };
  // Live preview like the theme switch: `changeLocale` persists + swaps the
  // i18next language, and `useTranslation` re-renders the page with the new copy.
  const updateLocale = (next: Locale) => {
    setLocaleState(next);
    changeLocale(next);
  };

  const resetAll = () => {
    clearAllSettings();
    setTransState(getTranscriptionSettings());
    setMangaState(getMangaSettings());
    toast.success(t('resetSuccess'));
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-display font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </header>

      {/* Theme */}
      <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div>
          <h2 className="font-bold text-foreground">{t('appearance.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('appearance.desc')}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: 'light' as Theme, label: t('appearance.light'), icon: Sun },
            { v: 'dark' as Theme, label: t('appearance.dark'), icon: Moon },
            { v: 'system' as Theme, label: t('appearance.system'), icon: Monitor },
          ]).map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => updateTheme(v)}
              className={`p-3 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-2 ${
                theme === v
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Language */}
      <section className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div>
          <h2 className="font-bold text-foreground">{t('language.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('language.desc')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { v: 'vi' as Locale, label: t('language.vietnamese') },
            { v: 'en' as Locale, label: t('language.english') },
          ]).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => updateLocale(v)}
              className={`p-3 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-2 ${
                locale === v
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <Languages className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Transcription defaults */}
      <section className="bg-card rounded-2xl border border-border p-5 space-y-5">
        <div>
          <h2 className="font-bold text-foreground">{t('transcription.title')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('transcription.desc')}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('transcription.mode')}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'study' as TranscriptionMode, label: t('transcription.modeStudy') },
              { value: 'read' as TranscriptionMode, label: t('transcription.modeRead') },
              { value: 'anki' as TranscriptionMode, label: t('transcription.modeAnki') },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateTrans({ transcriptionMode: opt.value })}
                className={`p-2 rounded-md border text-xs font-medium ${
                  trans.transcriptionMode === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('transcription.highlight')}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'token' as HighlightMode, label: t('transcription.highlightToken') },
              { value: 'sentence' as HighlightMode, label: t('transcription.highlightSentence') },
              { value: 'none' as HighlightMode, label: t('transcription.highlightNone') },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateTrans({ highlightMode: opt.value })}
                className={`p-2 rounded-md border text-xs font-medium ${
                  trans.highlightMode === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('transcription.layout')}
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {([
              { value: 'split-v' as ViewerLayout, label: t('transcription.layoutSplitV') },
              { value: 'split-h' as ViewerLayout, label: t('transcription.layoutSplitH') },
              { value: 'video' as ViewerLayout, label: t('transcription.layoutVideo') },
              { value: 'transcript' as ViewerLayout, label: t('transcription.layoutTranscript') },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateTrans({ layout: opt.value })}
                className={`p-2 rounded-md border text-[11px] font-medium ${
                  trans.layout === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="autoscroll-default" className="text-sm cursor-pointer">
            {t('transcription.autoScroll')}
          </Label>
          <Switch
            id="autoscroll-default"
            checked={trans.autoScroll}
            onCheckedChange={(v) => updateTrans({ autoScroll: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="a11y-mode-default" className="text-sm cursor-pointer">
            {t('transcription.a11yMode')}
            <span className="block text-[11px] text-muted-foreground font-normal">
              {t('transcription.a11yModeHint')}
            </span>
          </Label>
          <Switch
            id="a11y-mode-default"
            checked={trans.a11yMode}
            onCheckedChange={(v) => updateTrans({ a11yMode: v })}
          />
        </div>

        <Separator />


        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('transcription.hiddenRange')}
            </Label>
            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
              {trans.hiddenRange[0]} – {trans.hiddenRange[1]}
            </span>
          </div>
          <RangeSlider
            min={1}
            max={10}
            step={1}
            value={trans.hiddenRange}
            onValueChange={(v) =>
              updateTrans({ hiddenRange: [v[0], v[1]] as [number, number] })
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('transcription.visibleRange')}
            </Label>
            <span className="text-xs font-mono bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">
              {trans.visibleRange[0]} – {trans.visibleRange[1]}
            </span>
          </div>
          <RangeSlider
            min={0}
            max={15}
            step={1}
            value={trans.visibleRange}
            onValueChange={(v) =>
              updateTrans({ visibleRange: [v[0], v[1]] as [number, number] })
            }
            rangeClassName="bg-emerald-500"
          />
        </div>
      </section>

      {/* Manga defaults */}
      <section className="bg-card rounded-2xl border border-border p-5 space-y-5">
        <div>
          <h2 className="font-bold text-foreground">{t('manga.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('manga.desc')}</p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="auto-open" className="text-sm cursor-pointer">
            {t('manga.autoOpenPanel')}
          </Label>
          <Switch
            id="auto-open"
            checked={manga.autoOpenPanelOnBlock}
            onCheckedChange={(v) => updateManga({ autoOpenPanelOnBlock: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="ocr-boxes" className="text-sm cursor-pointer">
            {t('manga.showOcrBoxes')}
          </Label>
          <Switch
            id="ocr-boxes"
            checked={manga.showOCRBoxes}
            onCheckedChange={(v) => updateManga({ showOCRBoxes: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('manga.zoom')}
            </Label>
            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
              {manga.zoom}%
            </span>
          </div>
          <Slider
            min={50}
            max={200}
            step={5}
            value={[manga.zoom]}
            onValueChange={(v) => updateManga({ zoom: v[0] })}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button variant="outline" onClick={resetAll} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          {t('resetDefaults')}
        </Button>
      </div>
    </div>
  );
}
