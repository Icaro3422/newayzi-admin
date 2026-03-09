import { AuthLayout } from "@/components/auth/AuthLayout";
import { CustomSignUp } from "@/components/auth/CustomSignUp";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <CustomSignUp />
    </AuthLayout>
  );
}
