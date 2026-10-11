import { redirect } from "next/navigation";

/**
 * In-platform reading is postponed: students only DOWNLOAD files
 * (see app/download/[materialId]/route.ts). Old /read/<id> links and
 * bookmarks land on the course list instead of exposing a viewer.
 */
export default function ReadMaterialPage(): never {
  redirect("/courses");
}
