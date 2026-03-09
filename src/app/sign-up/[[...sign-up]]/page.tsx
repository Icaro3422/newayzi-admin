import { AuthLayout } from "@/components/auth/AuthLayout";
import { CustomSignUp } from "@/components/auth/CustomSignUp";

export const metadata = {
  title: "Crear cuenta | Newayzi Admin",
};

export default function SignUpPage() {
  return (
    <AuthLayout>
      <CustomSignUp />
    </AuthLayout>
  );
}
