import {
  AlertTriangle,
  Boxes,
  Circle,
  House,
  Inbox,
  ScrollText,
  Search,
  ListChecks,
  ShoppingCart,
  Store,
  Tag,
  Truck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Looks only: which picture goes with a menu key. Which entries exist comes from the server.
const byKey: Record<string, LucideIcon> = {
  home: House,
  items: Tag,
  warehouse: Boxes,
  stock: Boxes,
  branches: Store,
  users: Users,
  sell: ShoppingCart,
  sales: ListChecks,
  find: Search,
  receive: Inbox,
  receive_stock: Inbox,
  dispatch: Truck,
  activity: ScrollText,
  shortfalls: AlertTriangle,
};

export const iconForMenuKey = (key: string): LucideIcon => byKey[key] ?? Circle;
