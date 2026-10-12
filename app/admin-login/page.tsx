import { redirect } from "next/navigation";

// Legacy URL kept for compatibility with existing bookmarks and links.
export default function LegacyAdminLoginRedirect() {
  redirect("/login/admin");
}
