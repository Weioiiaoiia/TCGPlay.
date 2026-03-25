import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./i18n";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CardVault from "./pages/CardVault";
import ThreeD from "./pages/ThreeD";
import Games from "./pages/Games";
import Album from "./pages/Album";
import Summary from "./pages/Summary";
import Profile from "./pages/Profile";
import { AuthProvider } from "./contexts/AuthContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/home" component={Dashboard} />
      <Route path="/card-vault" component={CardVault} />
      <Route path="/3d-space" component={ThreeD} />
      <Route path="/games" component={Games} />
      <Route path="/album" component={Album} />
      <Route path="/summary" component={Summary} />
      <Route path="/profile" component={Profile} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
