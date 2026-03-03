import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-semantic-surface-subdued">
      <SignIn
        fallbackRedirectUrl="/admin"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
