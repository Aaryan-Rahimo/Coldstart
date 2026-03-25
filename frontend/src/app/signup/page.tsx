import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';

export default function SignupPage() {
  return (
    <AuthLayout>
      <AuthCard mode="signup" />
    </AuthLayout>
  );
}
