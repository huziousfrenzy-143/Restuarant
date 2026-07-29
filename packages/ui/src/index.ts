import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OrderStatus, InventoryStatus, SubscriptionStatus } from '@restaurant-saas/shared-schemas';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency formatter using JetBrains Mono / tabular-nums
export function formatCurrency(amount: number | string | undefined | null): string {
  const numericVal = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const validNum = isNaN(numericVal) ? 0 : numericVal;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(validNum);
}

// Order Status Helper - returns color token and human-readable label matching Design System section 3
export function getOrderStatusMeta(status: OrderStatus, isOverdue = false): {
  label: string;
  badgeClass: string;
  dotColorClass: string;
} {
  if (isOverdue) {
    return {
      label: 'Overdue',
      badgeClass: 'bg-red-50 text-[#C1440E] border border-[#C1440E]/30 animate-pulse',
      dotColorClass: 'bg-[#C1440E]'
    };
  }

  switch (status) {
    case 'new':
      return {
        label: 'New',
        badgeClass: 'bg-slate-100 text-[#4C6B8A] border border-[#4C6B8A]/30',
        dotColorClass: 'bg-[#4C6B8A]'
      };
    case 'preparing':
      return {
        label: 'Preparing',
        badgeClass: 'bg-amber-50 text-[#D48A1E] border border-[#D48A1E]/30',
        dotColorClass: 'bg-[#D48A1E]'
      };
    case 'ready':
      return {
        label: 'Ready',
        badgeClass: 'bg-emerald-50 text-[#3E7A4C] border border-[#3E7A4C]/30',
        dotColorClass: 'bg-[#3E7A4C]'
      };
    case 'out_for_delivery':
      return {
        label: 'Out for delivery',
        badgeClass: 'bg-sky-50 text-[#4C6B8A] border border-[#4C6B8A]/30',
        dotColorClass: 'bg-[#4C6B8A]'
      };
    case 'completed':
      return {
        label: 'Completed',
        badgeClass: 'bg-gray-100 text-[#6B7178] border border-[#6B7178]/20',
        dotColorClass: 'bg-[#6B7178]'
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-red-50 text-[#C1440E] border border-[#C1440E]/30',
        dotColorClass: 'bg-[#C1440E]'
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-gray-100 text-gray-700',
        dotColorClass: 'bg-gray-500'
      };
  }
}

// Inventory Status Helper
export function getInventoryStatusMeta(status: InventoryStatus): {
  label: string;
  badgeClass: string;
  dotColorClass: string;
} {
  switch (status) {
    case 'in_stock':
      return {
        label: 'In stock',
        badgeClass: 'bg-emerald-50 text-[#3E7A4C] border border-[#3E7A4C]/30',
        dotColorClass: 'bg-[#3E7A4C]'
      };
    case 'low_stock':
      return {
        label: 'Low stock',
        badgeClass: 'bg-amber-50 text-[#D48A1E] border border-[#D48A1E]/30',
        dotColorClass: 'bg-[#D48A1E]'
      };
    case 'out_of_stock':
      return {
        label: 'Out of stock',
        badgeClass: 'bg-red-50 text-[#C1440E] border border-[#C1440E]/30',
        dotColorClass: 'bg-[#C1440E]'
      };
  }
}

// Subscription Status Helper
export function getSubscriptionStatusMeta(status: SubscriptionStatus, expiresAt?: string): {
  label: string;
  badgeClass: string;
  dotColorClass: string;
} {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        badgeClass: 'bg-emerald-50 text-[#3E7A4C] border border-[#3E7A4C]/30',
        dotColorClass: 'bg-[#3E7A4C]'
      };
    case 'expiring_soon': {
      let days = 3;
      if (expiresAt) {
        const diff = new Date(expiresAt).getTime() - Date.now();
        days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }
      return {
        label: `Expires in ${days} days`,
        badgeClass: 'bg-amber-50 text-[#D48A1E] border border-[#D48A1E]/30',
        dotColorClass: 'bg-[#D48A1E]'
      };
    }
    case 'expired':
      return {
        label: 'Expired',
        badgeClass: 'bg-red-50 text-[#C1440E] border border-[#C1440E]/30',
        dotColorClass: 'bg-[#C1440E]'
      };
    case 'trial':
      return {
        label: 'Trial',
        badgeClass: 'bg-sky-50 text-[#4C6B8A] border border-[#4C6B8A]/30',
        dotColorClass: 'bg-[#4C6B8A]'
      };
  }
}
