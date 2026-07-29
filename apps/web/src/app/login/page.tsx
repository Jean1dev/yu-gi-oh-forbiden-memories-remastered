import { LoginForm } from "./login-form.tsx";

/** Static app shell; the session itself is resolved client-side by the form. */
export default function LoginPage() {
  return <LoginForm />;
}
