import { useCurrentMe } from '../../auth/guards';
import { GoodsReceiptList } from './GoodsReceiptList';
import { GoodsReceiptPage } from './GoodsReceiptPage';

/** Recording a receipt needs goods_receipts.manage; viewers without it get the read-only list. */
export function GoodsReceipts() {
  return useCurrentMe().permissions.includes('goods_receipts.manage') ? (
    <GoodsReceiptPage />
  ) : (
    <GoodsReceiptList />
  );
}
