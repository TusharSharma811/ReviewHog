import { createBrowserRouter, RouterProvider } from "react-router-dom"
import LandingPage from "./pages/Landing";
import SignInpage  from "./pages/auth/SignIn";
import SignUpPage from "./pages/auth/SignUp";



function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <LandingPage />,
    },
    {
      path: "/auth/signin",
      element: <SignInpage />,
    },
    {
      path: "/auth/signup",
      element: <SignUpPage />,
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App
