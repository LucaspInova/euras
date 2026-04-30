import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PartnerPortalHome from "./features/partner-portal/pages/PartnerPortalHome";
import PartnerPortalActivities from "./features/partner-portal/pages/PartnerPortalActivities";
import PartnerPortalProducts from "./features/partner-portal/pages/PartnerPortalProducts";
import PartnerPortalProductsAll from "./features/partner-portal/pages/PartnerPortalProductsAll";
import PartnerPortalProductCreate from "./features/partner-portal/pages/PartnerPortalProductCreate";
import PartnerPortalProductDetail from "./features/partner-portal/pages/PartnerPortalProductDetail";
import PartnerPortalProfile from "./features/partner-portal/pages/PartnerPortalProfile";
import PartnerPortalRequests from "./features/partner-portal/pages/PartnerPortalRequests";
import { ROLE_ADMIN, ROLE_PARTNER } from "./lib/authRoles";
import Activities from "./pages/Activities";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import PartnerCreate from "./pages/PartnerCreate";
import PartnerDetail from "./pages/PartnerDetail";
import PartnerProductCreate from "./pages/PartnerProductCreate";
import PartnerProductDetail from "./pages/PartnerProductDetail";
import PartnerProducts from "./pages/PartnerProducts";
import Partners from "./pages/Partners";
import Profile from "./pages/Profile";
import ProductCreate from "./pages/ProductCreate";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";
import StudentCreate from "./pages/StudentCreate";
import StudentDetail from "./pages/StudentDetail";
import StudentTransfer from "./pages/StudentTransfer";
import Students from "./pages/Students";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  const adminGuard = (node) => (
    <ProtectedRoute allowedRoles={[ROLE_ADMIN]}>{node}</ProtectedRoute>
  );

  const partnerGuard = (node) => (
    <ProtectedRoute allowedRoles={[ROLE_PARTNER]}>{node}</ProtectedRoute>
  );

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={adminGuard(<Dashboard />)} />
        <Route path="/alunos" element={adminGuard(<Students />)} />
        <Route path="/alunos/novo" element={adminGuard(<StudentCreate />)} />
        <Route path="/alunos/:studentId" element={adminGuard(<StudentDetail />)} />
        <Route
          path="/alunos/:studentId/transferir"
          element={adminGuard(<StudentTransfer />)}
        />
        <Route path="/parceiros" element={adminGuard(<Partners />)} />
        <Route path="/parceiros/novo" element={adminGuard(<PartnerCreate />)} />
        <Route path="/parceiros/:partnerId" element={adminGuard(<PartnerDetail />)} />
        <Route
          path="/parceiros/:partnerId/produtos"
          element={adminGuard(<PartnerProducts />)}
        />
        <Route
          path="/parceiros/:partnerId/produtos/novo"
          element={adminGuard(<PartnerProductCreate />)}
        />
        <Route
          path="/parceiros/:partnerId/produtos/:productId"
          element={adminGuard(<PartnerProductDetail />)}
        />
        <Route path="/produtos" element={adminGuard(<Products />)} />
        <Route path="/produtos/novo" element={adminGuard(<ProductCreate />)} />
        <Route path="/produtos/:productId" element={adminGuard(<ProductDetail />)} />
        <Route path="/atividades" element={adminGuard(<Activities />)} />
        <Route path="/perfil" element={adminGuard(<Profile />)} />

        <Route path="/parceiro" element={<Navigate to="/portal-parceiro" replace />} />
        <Route path="/portal-parceiro" element={partnerGuard(<PartnerPortalHome />)} />
        <Route
          path="/portal-parceiro/atividades"
          element={partnerGuard(<PartnerPortalActivities />)}
        />
        <Route
          path="/portal-parceiro/produtos"
          element={partnerGuard(<PartnerPortalProducts />)}
        />
        <Route
          path="/portal-parceiro/produtos/todos"
          element={partnerGuard(<PartnerPortalProductsAll />)}
        />
        <Route
          path="/portal-parceiro/produtos/novo"
          element={partnerGuard(<PartnerPortalProductCreate />)}
        />
        <Route
          path="/portal-parceiro/produtos/:productId"
          element={partnerGuard(<PartnerPortalProductDetail />)}
        />
        <Route
          path="/portal-parceiro/meu-perfil"
          element={partnerGuard(<PartnerPortalProfile />)}
        />
        <Route
          path="/portal-parceiro/solicitacoes"
          element={partnerGuard(<PartnerPortalRequests />)}
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
