import { AuthLayout } from "@/components/auth/AuthLayout";
import { CustomSignIn } from "@/components/auth/CustomSignIn";

export const metadata = {
  title: "Iniciar sesión | Newayzi Admin",
};

export default function SignInPage() {
  return (
    <AuthLayout>
      <CustomSignIn />
    </AuthLayout>
  );
}
