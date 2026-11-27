import { useCurrentMe } from '../../auth/guards';
import { Forbidden } from '../../pages/Forbidden';
import { GoodsReceiptList } from './GoodsReceiptList';
import { GoodsReceiptPage } from './GoodsReceiptPage';

/** Recording a receipt needs goods_receipts.manage; goods_receipts.view alone gets the read-only list. */
export function GoodsReceipts() {
  const { permissions } = useCurrentMe();
  if (permissions.includes('goods_receipts.manage')) return <GoodsReceiptPage />;
  if (permissions.includes('goods_receipts.view')) return <GoodsReceiptList />;
  return <Forbidden />;
}
