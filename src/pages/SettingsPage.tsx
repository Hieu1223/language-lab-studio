import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { getFieldConfig, saveFieldConfig } from '@/lib/api/flashcard';
import type { FlashcardFieldConfig } from '@/lib/api/flashcard';

const USER_ID = 'current-user';

interface SettingSection {
  title: string;
  settings: { key: string; label: string; desc: string; type: 'toggle' | 'select'; options?: string[] }[];
}

const sections: SettingSection[] = [
  {
    title: 'Phiên dịch',
    settings: [
      { key: 'autoScroll', label: 'Tự động cuộn', desc: 'Tự cuộn transcript theo video', type: 'toggle' },
      { key: 'clozeDefault', label: 'Bật Cloze mặc định', desc: 'Ẩn từ khi mở transcript', type: 'toggle' },
    ]
  },
  {
    title: 'Manga',
    settings: [
      { key: 'readingMode', label: 'Kiểu đọc mặc định', desc: 'Chọn kiểu đọc manga', type: 'select', options: ['Cuộn dọc', '1 trang', '2 trang'] },
      { key: 'autoOcr', label: 'Tự động OCR', desc: 'Chạy OCR khi mở trang mới', type: 'toggle' },
    ]
  },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    autoScroll: true, clozeDefault: false, autoOcr: false,
  });
  const [selects, setSelects] = useState<Record<string, string>>({
    readingMode: 'Cuộn dọc',
  });
  const [fieldConfig, setFieldConfig] = useState<FlashcardFieldConfig[]>([]);

  useEffect(() => {
    getFieldConfig(USER_ID).then(setFieldConfig);
  }, []);

  const handleFieldToggle = async (index: number, side: 'showOnFront' | 'showOnBack', value: boolean) => {
    const updated = fieldConfig.map((f, i) => i === index ? { ...f, [side]: value } : f);
    setFieldConfig(updated);
    await saveFieldConfig(USER_ID, updated);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Cài đặt</h2>
        <p className="text-sm text-muted-foreground">Tuỳ chỉnh trải nghiệm học tập.</p>
      </div>

      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.title} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-bold text-sm text-foreground">{section.title}</h3>
            </div>
            <div className="divide-y divide-border">
              {section.settings.map(s => (
                <div key={s.key} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  {s.type === 'toggle' ? (
                    <Switch
                      checked={toggles[s.key] ?? false}
                      onCheckedChange={v => setToggles(prev => ({ ...prev, [s.key]: v }))}
                    />
                  ) : (
                    <select
                      value={selects[s.key] ?? s.options?.[0]}
                      onChange={e => setSelects(prev => ({ ...prev, [s.key]: e.target.value }))}
                      className="text-sm bg-muted border border-border rounded-lg px-2 py-1 text-foreground"
                    >
                      {s.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Flashcard field display settings */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="font-bold text-sm text-foreground">Flashcard - Hiển thị field</h3>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-3">Chọn field nào hiển thị ở mặt trước và mặt sau của flashcard.</p>
            <div className="space-y-2">
              {fieldConfig.map((field, idx) => (
                <div key={field.field} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium text-foreground">{field.label}</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Checkbox
                        checked={field.showOnFront}
                        onCheckedChange={(v) => handleFieldToggle(idx, 'showOnFront', !!v)}
                      />
                      Mặt trước
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Checkbox
                        checked={field.showOnBack}
                        onCheckedChange={(v) => handleFieldToggle(idx, 'showOnBack', !!v)}
                      />
                      Mặt sau
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
