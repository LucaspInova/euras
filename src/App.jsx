import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import PartnerCreate from "./pages/PartnerCreate";
import PartnerDetail from "./pages/PartnerDetail";
import PartnerProductCreate from "./pages/PartnerProductCreate";
import PartnerProductDetail from "./pages/PartnerProductDetail";
import PartnerProducts from "./pages/PartnerProducts";
import Partners from "./pages/Partners";
import SectionBlank from "./pages/SectionBlank";
import StudentCreate from "./pages/StudentCreate";
import StudentDetail from "./pages/StudentDetail";
import StudentTransfer from "./pages/StudentTransfer";
import Students from "./pages/Students";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alunos"
          element={
            <ProtectedRoute>
              <Students />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alunos/novo"
          element={
            <ProtectedRoute>
              <StudentCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alunos/:studentId"
          element={
            <ProtectedRoute>
              <StudentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alunos/:studentId/transferir"
          element={
            <ProtectedRoute>
              <StudentTransfer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parceiros"
          element={
            <ProtectedRoute>
              <Partners />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parceiros/novo"
          element={
            <ProtectedRoute>
              <PartnerCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parceiros/:partnerId"
          element={
            <ProtectedRoute>
              <PartnerDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parceiros/:partnerId/produtos"
          element={
            <ProtectedRoute>
              <PartnerProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parceiros/:partnerId/produtos/novo"
          element={
            <ProtectedRoute>
              <PartnerProductCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parceiros/:partnerId/produtos/:productId"
          element={
            <ProtectedRoute>
              <PartnerProductDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/produtos"
          element={
            <ProtectedRoute>
              <SectionBlank title="Produtos" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/atividades"
          element={
            <ProtectedRoute>
              <SectionBlank title="Atividades" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <SectionBlank title="Meu perfil" />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
