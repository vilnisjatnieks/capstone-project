import Link from "next/link";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const isError = error === "invalid";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        {isError ? (
          <>
            <h1 className="text-2xl font-bold">Link expired or invalid</h1>
            <p className="text-muted-foreground">
              This verification link has expired or has already been used.
            </p>
            <p className="text-muted-foreground">
              Go to the{" "}
              <Link href="/login" className="underline">
                login page
              </Link>{" "}
              to request a new verification email.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground">
              We sent a verification link to your email address. Click the link
              to activate your account.
            </p>
            <p className="text-sm text-muted-foreground">
              The link expires in 24 hours. Didn&apos;t receive it?{" "}
              <Link href="/login" className="underline">
                Go to login
              </Link>{" "}
              to resend.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
