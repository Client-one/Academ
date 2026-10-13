import { logout } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitButton
        variant="ghost"
        size="sm"
      >
        تسجيل الخروج
      </SubmitButton>
    </form>
  );
}
