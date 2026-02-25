import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Import pages
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import Locations from "./pages/Locations";
import Menu from "./pages/Menu";
import Users from "./pages/Users";
import Kitchen from "./pages/Kitchen";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      {/* We use ProtectedRoute wrapper inside the components themselves for elegant layout wrapping */}
      <Route path="/" component={Dashboard} />
      <Route path="/locations" component={Locations} />
      <Route path="/menu" component={Menu} />
      <Route path="/users" component={Users} />
      <Route path="/kitchen" component={Kitchen} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
