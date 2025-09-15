import logo from '@/assets/pmc3d.svg';
import { LoginForm } from '@/components/LoginForm';

export function meta() {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Main() {
  return (
    <div className="w-3/4 md:w-1/4 mx-auto flex-1 items-center">
      <img src={logo} alt="PMC logo"/>
      <LoginForm />
    </div>
  );
}
