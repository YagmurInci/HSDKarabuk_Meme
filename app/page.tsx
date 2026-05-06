import { redirect } from "next/navigation";

// ============================================
// ANA SAYFA — / rotası
// Kullanıcıyı doğrudan login sayfasına yönlendirir.
// ============================================

export default function Home() {
  redirect("/login");
}
