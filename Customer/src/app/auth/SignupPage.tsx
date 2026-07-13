import {Navigate} from 'react-router-dom';

/** Legacy /signup → start with mobile OTP login; Create Account runs after first login. */
export default function SignupPage() {
  return <Navigate to="/login" replace state={{fromSignup: true}} />;
}
