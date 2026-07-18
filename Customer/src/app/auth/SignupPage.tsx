import {Navigate, useLocation} from 'react-router-dom';

/** Legacy /signup → start with mobile OTP login; Create Account runs after first login. */
export default function SignupPage() {
  const {search} = useLocation();
  return <Navigate to={`/login${search}`} replace state={{fromSignup: true}} />;
}
