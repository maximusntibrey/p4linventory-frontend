import { Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireMenu, RequirePermission } from './auth/guards';
import type { Me } from './auth/session';
import { AppShell } from './components/AppShell';
import { ChangePassword } from './pages/ChangePassword';
import { ComingSoon } from './pages/ComingSoon';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';

/** Screens a later step builds. Each is opened by one permission from the me endpoint; the server still checks every request. */
const guardedScreens: { path: string; title: string; permission: Me['permissions'][number] }[] = [
  { path: 'items', title: 'Items', permission: 'items.view' },
  { path: 'warehouse', title: 'Warehouse', permission: 'stock.view' },
  { path: 'branches', title: 'Branches', permission: 'branches.view' },
  { path: 'users', title: 'Users', permission: 'users.view' },
  { path: 'stock', title: 'Stock', permission: 'stock.view' },
  { path: 'find', title: 'Find', permission: 'items.view' },
  { path: 'receive', title: 'Receive', permission: 'dispatches.waiting' },
  { path: 'goods-receipts', title: 'Receive stock', permission: 'goods_receipts.manage' },
  { path: 'dispatches', title: 'Dispatch', permission: 'dispatches.create' },
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
            path="sell"
            element={
              <RequireMenu path="/sell">
                <ComingSoon title="Sell" />
              </RequireMenu>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
