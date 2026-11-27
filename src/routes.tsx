import { lazy, Suspense } from 'react';
import Box from '@mui/material/Box';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './pages/Login';
import { ChangePassword } from './pages/ChangePassword';
import { NotFound } from './pages/NotFound';
import { ComingSoon } from './pages/ComingSoon';
import { RequireAuth, RequirePermission } from './auth/guards';
import type { Me } from './auth/session';
import { AppShell } from './components/AppShell';

// Every screen is its own chunk: the first load carries only the shell and the screen being opened.
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const AuditLogsPage = lazy(() =>
  import('./features/audit/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })),
);
const BranchesPage = lazy(() =>
  import('./features/branches/BranchesPage').then((m) => ({ default: m.BranchesPage })),
);
const DispatchesPage = lazy(() =>
  import('./features/dispatches/DispatchesPage').then((m) => ({ default: m.DispatchesPage })),
);
const DispatchNew = lazy(() =>
  import('./features/dispatches/DispatchNew').then((m) => ({ default: m.DispatchNew })),
);
const ImportPage = lazy(() =>
  import('./features/items/ImportPage').then((m) => ({ default: m.ImportPage })),
);
const FindPage = lazy(() =>
  import('./features/find/FindPage').then((m) => ({ default: m.FindPage })),
);
const GoodsReceiptPage = lazy(() =>
  import('./features/goodsReceipts/GoodsReceiptPage').then((m) => ({
    default: m.GoodsReceiptPage,
  })),
);
const ItemDetail = lazy(() =>
  import('./features/items/ItemDetail').then((m) => ({ default: m.ItemDetail })),
);
const ItemNew = lazy(() =>
  import('./features/items/ItemNew').then((m) => ({ default: m.ItemNew })),
);
const ItemsPage = lazy(() =>
  import('./features/items/ItemsPage').then((m) => ({ default: m.ItemsPage })),
);
const ReceiveDispatch = lazy(() =>
  import('./features/receiving/ReceiveDispatch').then((m) => ({ default: m.ReceiveDispatch })),
);
const WaitingPage = lazy(() =>
  import('./features/receiving/WaitingPage').then((m) => ({ default: m.WaitingPage })),
);
const SalesPage = lazy(() =>
  import('./features/sales/SalesPage').then((m) => ({ default: m.SalesPage })),
);
const SellPage = lazy(() =>
  import('./features/sales/SellPage').then((m) => ({ default: m.SellPage })),
);
const ShortfallsPage = lazy(() =>
  import('./features/shortfalls/ShortfallsPage').then((m) => ({ default: m.ShortfallsPage })),
);
const StockPage = lazy(() =>
  import('./features/stock/StockPage').then((m) => ({ default: m.StockPage })),
);
const UserDetail = lazy(() =>
  import('./features/users/UserDetail').then((m) => ({ default: m.UserDetail })),
);
const UserNew = lazy(() =>
  import('./features/users/UserNew').then((m) => ({ default: m.UserNew })),
);
const UsersPage = lazy(() =>
  import('./features/users/UsersPage').then((m) => ({ default: m.UsersPage })),
);

/** Screens a later step builds. Each is opened by one permission from the me endpoint; the server still checks every request. */
const guardedScreens: { path: string; title: string; permission: Me['permissions'][number] }[] = [
  { path: 'warehouse', title: 'Warehouse', permission: 'stock.view' },
];

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <Box role="status" sx={{ p: 2 }}>
          Loading…
        </Box>
      }
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth pending />}>
          <Route path="/password-change" element={<ChangePassword forced />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route
              index
              element={
                <Suspense fallback={<p role="status">Loading…</p>}>
                  <Home />
                </Suspense>
              }
            />
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
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
