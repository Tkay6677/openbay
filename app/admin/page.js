import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import NavBar from "../../components/NavBar";
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
      <NavBar />
      <main className="container">
        <div className="section">
          <h1 style={{ marginBottom: 24 }}>Admin Dashboard</h1>
          <AdminDashboard />
        </div>
      </main>
      <Footer />
    </>
  );
}

