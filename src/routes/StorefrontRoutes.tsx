import { Outlet, Route, Routes } from "react-router-dom";
import App from "../App";

function StorefrontLayout() {
  return <Outlet />;
}

export default function StorefrontRoutes() {
  return (
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route index element={<App />} />
        <Route path="products" element={<App />} />
        <Route path="products/:slug" element={<App />} />
        <Route path="product/:slug" element={<App />} />
        <Route path="category/:slug" element={<App />} />
        <Route path="cart" element={<App />} />
        <Route path="wishlist" element={<App />} />
        <Route path="checkout" element={<App />} />
        <Route path="orders" element={<App />} />
        <Route path="track" element={<App />} />
        <Route path="about" element={<App />} />
        <Route path="login" element={<App />} />
        <Route path="register" element={<App />} />
        <Route path="logout" element={<App />} />
        <Route path="admin" element={<App />} />
        <Route path="admin-panel/*" element={<App />} />
        <Route path="analytics" element={<App />} />
        <Route path="*" element={<App />} />
      </Route>
    </Routes>
  );
}
