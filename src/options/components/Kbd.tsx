import { formatSerializedChord } from '@/shared/keybinding';

/** Renders a serialized chord as key caps, e.g. [Alt] [1]. */
export function Kbd({ chord }: { chord: string | null }) {
  const text = formatSerializedChord(chord);
  if (!text) return <span class="muted">—</span>;
  const keys = text.includes('+')
    ? text.split('+')
    : [...text.matchAll(/[⌃⌥⇧⌘]|[^⌃⌥⇧⌘]+/g)].map((m) => m[0]);
  return (
    <span class="kbd-group">
      {keys.map((key, i) => (
        <kbd key={i}>{key}</kbd>
      ))}
    </span>
  );
}
