import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-semantic-surface-subdued">
      <SignUp
        fallbackRedirectUrl="/admin"
        signInUrl="/sign-in"
      />
    </div>
  );
}
