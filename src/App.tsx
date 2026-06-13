import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ProfileValidatedRoute } from "./components/auth/ProfileValidatedRoute";
import { CheckoutPage } from "./pages/CheckoutPage";
import { CompleteProfilePage } from "./pages/CompleteProfilePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="stars" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route
          path="/home"
          element={
            <ProfileValidatedRoute>
              <HomePage />
            </ProfileValidatedRoute>
          }
        />
        <Route
          path="/home/checkout"
          element={
            <ProfileValidatedRoute>
              <CheckoutPage />
            </ProfileValidatedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  );
}
