import { AuthLayout } from "@/components/auth/AuthLayout";
import { CustomSignIn } from "@/components/auth/CustomSignIn";

export default function SignInPage() {
  return (
    <AuthLayout>
      <CustomSignIn />
    </AuthLayout>
  );
}
