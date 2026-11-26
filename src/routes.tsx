import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequirePermission, useCurrentMe } from './auth/guards';
import type { Me } from './auth/session';
import { AppShell } from './components/AppShell';
import { AuditLogsPage } from './features/audit/AuditLogsPage';
import { BranchesPage } from './features/branches/BranchesPage';
import { DispatchesPage } from './features/dispatches/DispatchesPage';
import { DispatchNew } from './features/dispatches/DispatchNew';
import { ImportPage } from './features/items/ImportPage';
import { FindPage } from './features/find/FindPage';
import { GoodsReceiptPage } from './features/goodsReceipts/GoodsReceiptPage';
import { ItemDetail } from './features/items/ItemDetail';
import { ItemNew } from './features/items/ItemNew';
import { ItemsPage } from './features/items/ItemsPage';
import { ReceiveDispatch } from './features/receiving/ReceiveDispatch';
import { WaitingPage } from './features/receiving/WaitingPage';
import { SalesPage } from './features/sales/SalesPage';
import { SellPage } from './features/sales/SellPage';
import { ShortfallsPage } from './features/shortfalls/ShortfallsPage';
import { StockPage } from './features/stock/StockPage';
import { UserDetail } from './features/users/UserDetail';
import { UserNew } from './features/users/UserNew';
import { UsersPage } from './features/users/UsersPage';
import { ChangePassword } from './pages/ChangePassword';
import { ComingSoon } from './pages/ComingSoon';
import { Home } from './pages/Home';
import { Forbidden } from './pages/Forbidden';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';

const DesignSystem = lazy(() => import('./pages/DesignSystem'));

/**
 * Living design-system showcase: open in dev, and in production only when the server says the user
 * works across all branches (Super Admin). The contract has no dedicated permission for it (see TASKS Open questions).
 */
/** The one place that decides who opens the showcase. Swap its body for the backend permission once the contract has one (owner: approved, pending backend). */
export const canOpenDesignSystem = (me: Pick<Me, 'all_branches'>): boolean =>
  import.meta.env.DEV || me.all_branches;

function DesignSystemGate() {
  const me = useCurrentMe();
  if (!canOpenDesignSystem(me)) return <Forbidden />;
  return (
    <Suspense fallback={<p role="status">Loading…</p>}>
      <DesignSystem />
    </Suspense>
  );
}

/** Screens a later step builds. Each is opened by one permission from the me endpoint; the server still checks every request. */
const guardedScreens: { path: string; title: string; permission: Me['permissions'][number] }[] = [
  { path: 'warehouse', title: 'Warehouse', permission: 'stock.view' },
];

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth pending />}>
        <Route path="/password-change" element={<ChangePassword forced />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="account/password" element={<ChangePassword />} />
          {guardedScreens.map(({ path, title, permission }) => (
            <Route
              key={path}
              path={path}
              element={
                <RequirePermission permission={permission}>
                  <ComingSoon title={title} />
                </RequirePermission>
              }
            />
          ))}
          <Route
            path="audit-logs"
            element={
              <RequirePermission permission="activity.view">
                <AuditLogsPage />
              </RequirePermission>
            }
          />
          {/* The old address keeps working. */}
          <Route path="activity" element={<Navigate to="/audit-logs" replace />} />
          <Route
            path="shortfalls"
            element={
              <RequirePermission permission="shortfalls.resolve">
                <ShortfallsPage />
              </RequirePermission>
            }
          />
          <Route
            path="sell"
            element={
              <RequirePermission permission="sales.record">
                <SellPage />
              </RequirePermission>
            }
          />
          <Route
            path="sell/sales"
            element={
              <RequirePermission permission="sales.record">
                <SalesPage />
              </RequirePermission>
            }
          />
          <Route
            path="items/import"
            element={
              <RequirePermission permission="items.import">
                <ImportPage />
              </RequirePermission>
            }
          />
          <Route
            path="find"
            element={
              <RequirePermission permission="find.use">
                <FindPage />
              </RequirePermission>
            }
          />
          <Route
            path="goods-receipts"
            element={
              <RequirePermission permission="goods_receipts.manage">
                <GoodsReceiptPage />
              </RequirePermission>
            }
          />
          <Route
            path="dispatches"
            element={
              <RequirePermission permission="dispatches.view">
                <DispatchesPage />
              </RequirePermission>
            }
          />
          <Route
            path="dispatches/new"
            element={
              <RequirePermission permission="dispatches.create">
                <DispatchNew />
              </RequirePermission>
            }
          />
          <Route
            path="receive"
            element={
              <RequirePermission permission="dispatches.waiting">
                <WaitingPage />
              </RequirePermission>
            }
          />
          <Route
            path="receive/:id"
            element={
              <RequirePermission permission="dispatches.waiting">
                <ReceiveDispatch />
              </RequirePermission>
            }
          />
          <Route
            path="items"
            element={
              <RequirePermission permission="items.view">
                <ItemsPage />
              </RequirePermission>
            }
          />
          <Route
            path="items/new"
            element={
              <RequirePermission permission="items.manage">
                <ItemNew />
              </RequirePermission>
            }
          />
          <Route
            path="items/:id"
            element={
              <RequirePermission permission="items.view">
                <ItemDetail />
              </RequirePermission>
            }
          />
          <Route
            path="stock"
            element={
              <RequirePermission permission="stock.view">
                <StockPage />
              </RequirePermission>
            }
          />
          <Route
            path="branches"
            element={
              <RequirePermission permission="branches.view">
                <BranchesPage />
              </RequirePermission>
            }
          />
          <Route
            path="users"
            element={
              <RequirePermission permission="users.view">
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route
            path="users/new"
            element={
              <RequirePermission permission="users.manage">
                <UserNew />
              </RequirePermission>
            }
          />
          <Route
            path="users/:id"
            element={
              <RequirePermission permission="users.view">
                <UserDetail />
              </RequirePermission>
            }
          />
          <Route path="design-system" element={<DesignSystemGate />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
