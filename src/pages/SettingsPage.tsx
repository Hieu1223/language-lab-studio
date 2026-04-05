import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

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
      { key: 'clozePercent', label: 'Tỷ lệ ẩn từ', desc: 'Phần trăm từ bị ẩn', type: 'select', options: ['10%', '25%', '50%'] },
    ]
  },
  {
    title: 'Manga',
    settings: [
      { key: 'readingMode', label: 'Kiểu đọc mặc định', desc: 'Chọn kiểu đọc manga', type: 'select', options: ['Cuộn dọc', '1 trang', '2 trang'] },
      { key: 'autoOcr', label: 'Tự động OCR', desc: 'Chạy OCR khi mở trang mới', type: 'toggle' },
    ]
  },
  {
    title: 'Flashcard',
    settings: [
      { key: 'dailyLimit', label: 'Giới hạn thẻ mới/ngày', desc: 'Số thẻ mới tối đa mỗi ngày', type: 'select', options: ['5', '10', '20', '50'] },
      { key: 'autoAudio', label: 'Tự phát âm', desc: 'Phát âm thanh khi hiện thẻ', type: 'toggle' },
    ]
  },
  {
    title: 'Luyện tập',
    settings: [
      { key: 'defaultMode', label: 'Chế độ mặc định', desc: 'Chế độ luyện câu mặc định', type: 'select', options: ['JP → VN', 'VN → JP'] },
      { key: 'showHints', label: 'Hiện gợi ý', desc: 'Hiện gợi ý ngữ pháp khi luyện', type: 'toggle' },
    ]
  },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    autoScroll: true, clozeDefault: false, autoOcr: false, autoAudio: false, showHints: true,
  });
  const [selects, setSelects] = useState<Record<string, string>>({
    clozePercent: '25%', readingMode: 'Cuộn dọc', dailyLimit: '20', defaultMode: 'JP → VN',
  });

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
      </div>
    </div>
  );
}
