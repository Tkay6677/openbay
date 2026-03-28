import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import Footer from "../../components/Footer";
import AdminDashboard from "../../components/AdminDashboard";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { isAdminSession } from "../../lib/admin";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/?login=1&callbackUrl=%2Fadmin");
  }
  if (!isAdminSession(session)) {
    notFound();
  }

  return (
    <>
      <main className="container" style={{ paddingTop: 24, paddingBottom: 24, "--header-height": "0px" }}>
        <AdminDashboard />
      </main>
      <Footer />
    </>
  );
}

