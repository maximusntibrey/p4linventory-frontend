import { Route, Routes } from 'react-router-dom';
import { RequireAuth, RequirePermission } from './auth/guards';
import type { Me } from './auth/session';
import { AppShell } from './components/AppShell';
import { BranchesPage } from './features/branches/BranchesPage';
import { UserDetail } from './features/users/UserDetail';
import { UserNew } from './features/users/UserNew';
import { UsersPage } from './features/users/UsersPage';
import { ChangePassword } from './pages/ChangePassword';
import { ComingSoon } from './pages/ComingSoon';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';

/** Screens a later step builds. Each is opened by one permission from the me endpoint; the server still checks every request. */
const guardedScreens: { path: string; title: string; permission: Me['permissions'][number] }[] = [
  { path: 'items', title: 'Items', permission: 'items.view' },
  { path: 'warehouse', title: 'Warehouse', permission: 'stock.view' },
  { path: 'stock', title: 'Stock', permission: 'stock.view' },
  { path: 'find', title: 'Find', permission: 'find.use' },
  { path: 'activity', title: 'Activity', permission: 'activity.view' },
  { path: 'sell', title: 'Sell', permission: 'sales.record' },
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
  );
}
