import { Outlet } from 'react-router';

export default function AuthorizedLayout() {
  return (
    <>
      <nav className="bg-amber-100">
        <h1>this is a navbar</h1>
      </nav>
      <Outlet />
    </>
  );
}
