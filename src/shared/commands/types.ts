export interface CommandDefinition {
  /** Stable id, used as storage key. Never rename once released. */
  id: string;
  title: string;
  category: string;
  description: string;
  /** Default chord in serialized form (see keybinding/chord.ts), or null for unbound. */
  defaultKey: string | null;
}
