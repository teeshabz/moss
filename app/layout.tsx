import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ErrorBoundaryWrapper } from "@/lib/components/ErrorBoundaryWrapper";
import { mossClerkAppearance } from "@/lib/clerk-appearance";

export const metadata: Metadata = {
  title: "Moss",
  description: "Share what you're reading, watching, and listening to",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={mossClerkAppearance}
      localization={{
        formButtonPrimary: 'continue →',
        formFieldLabel__emailAddress_username: 'EMAIL OR USERNAME',
        formFieldInputPlaceholder__emailAddress_username: 'enter email or username',
        lastAuthenticationStrategy: '',
        socialButtonsBlockButton: 'sign in with {{provider}}',
        signIn: {
          start: {
            title: 'sign in',
            subtitle: '',
            actionText: "don't have an account? ",
            actionLink: 'sign up',
          },
          emailCode: {
            subtitle: '',
            resendButton: "didn't receive a code? resend",
          },
          alternativeMethods: {
            title: '',
            actionLink: '',
          },
        },
      }}
    >
      <html lang="en">
        <body>
          <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
