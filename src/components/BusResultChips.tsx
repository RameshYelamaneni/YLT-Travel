import {
  BadgeCheck, MapPin, Moon, Radio, Snowflake, Tag,
} from 'lucide-react';
import type { Bus } from '../types';
import { resultChipOverflowCount, resultChips, type BusDetailsTab } from '../lib/busInsights';

const KIND_CLASS: Record<string, string> = {
  trust: 'ylt-result-chip ylt-result-chip--trust',
  amenity: 'ylt-result-chip ylt-result-chip--amenity',
  offer: 'ylt-result-chip ylt-result-chip--offer',
  point: 'ylt-result-chip ylt-result-chip--point',
};

function ChipIcon({ id }: { id: string }) {
  if (id === 'gps') return <Radio className="h-3 w-3" />;
  if (id === 'night') return <Moon className="h-3 w-3" />;
  if (id === 'points') return <MapPin className="h-3 w-3" />;
  if (id === 'am-AC') return <Snowflake className="h-3 w-3" />;
  if (id.startsWith('am-')) return <BadgeCheck className="h-3 w-3" />;
  return <Tag className="h-3 w-3" />;
}

export default function BusResultChips({
  bus,
  onOpen,
}: {
  bus: Bus;
  onOpen: (tab: BusDetailsTab) => void;
}) {
  const chips = resultChips(bus);
  const moreCount = resultChipOverflowCount(bus);
  if (!chips.length && moreCount <= 0) return null;

  return (
    <div className="ylt-result-chips" aria-label="Trip highlights">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onOpen(chip.tab)}
          className={KIND_CLASS[chip.kind]}
        >
          <ChipIcon id={chip.id} />
          {chip.label}
        </button>
      ))}
      {moreCount > 0 && (
        <button
          type="button"
          onClick={() => onOpen('amenities')}
          className="ylt-result-chip ylt-result-chip--more"
        >
          +{moreCount} more
        </button>
      )}
    </div>
  );
}
