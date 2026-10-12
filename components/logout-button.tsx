import { logout } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function LogoutButton({ onDark = false }: { onDark?: boolean }) {
  return (
    <form action={logout}>
      <SubmitButton
        variant="ghost"
        size="sm"
        className={onDark ? "!text-brand-100 hover:!bg-white/10 focus-visible:ring-offset-slate-950" : ""}
      >
        تسجيل الخروج
      </SubmitButton>
    </form>
  );
}
