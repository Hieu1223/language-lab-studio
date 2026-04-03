import type { TokenizedResult } from '@/lib/api/types';
import { motion } from 'framer-motion';

const POS_COLORS: Record<string, string> = {
  noun: 'bg-primary/10 text-primary border-primary/20',
  verb: 'bg-success/10 text-success border-success/20',
  adjective: 'bg-warning/10 text-warning border-warning/20',
  adverb: 'bg-accent/10 text-accent border-accent/20',
  particle: 'bg-muted text-muted-foreground border-border',
  pronoun: 'bg-destructive/10 text-destructive border-destructive/20',
  preposition: 'bg-primary/10 text-primary border-primary/20',
  conjunction: 'bg-muted text-muted-foreground border-border',
  classifier: 'bg-warning/10 text-warning border-warning/20',
  interjection: 'bg-success/10 text-success border-success/20',
};

interface Props {
  result: TokenizedResult;
}

export function TokenDisplay({ result }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs font-mono text-muted-foreground mb-4">Original: {result.original}</p>
      <div className="flex flex-wrap gap-2">
        {result.tokens.map((token, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`px-3 py-2 rounded-lg border text-sm ${POS_COLORS[token.partOfSpeech] || 'bg-card border-border text-foreground'}`}
          >
            <div className="font-medium">{token.token}</div>
            <div className="text-[10px] font-mono opacity-70 mt-0.5">{token.partOfSpeech}</div>
            <div className="text-xs opacity-80 mt-0.5">{token.meaning}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
