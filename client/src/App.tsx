import { Router as WouterRouter, Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n";
import NotFound from "@/pages/not-found";

// Import pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Locations from "./pages/Locations";
import Menu from "./pages/Menu";
import Users from "./pages/Users";
import Kitchen from "./pages/Kitchen";
import KitchenView from "./pages/KitchenView";
import Modifiers from "./pages/Modifiers";
import StatisticsLanding from "./pages/StatisticsLanding";
import StatisticsView from "./pages/StatisticsView";
import Waiter from "./pages/Waiter";
import WaiterView from "./pages/WaiterView";
import TimeTracking from "./pages/TimeTracking";


function App() {
  return (
    <WouterRouter>
      <ThemeProvider>
        <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Switch>
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/forgot-password" component={ForgotPassword} />
                <Route path="/reset-password" component={ResetPassword} />
                <Route path="/waiter/view" component={WaiterView} />
                <Route path="/kitchen/view" component={KitchenView} />
                <Route path="/locations" component={Locations} />
                <Route path="/menu" component={Menu} />
                <Route path="/modifiers" component={Modifiers} />
                <Route path="/users" component={Users} />
                <Route path="/time-tracking" component={TimeTracking} />
                <Route path="/waiter" component={Waiter} />
                <Route path="/kitchen" component={Kitchen} />
                <Route path="/statistics/view" component={StatisticsView} />
                <Route path="/statistics" component={StatisticsLanding} />
                <Route path="/" component={Dashboard} />
                <Route component={NotFound} />
              </Switch>
            </TooltipProvider>
          </QueryClientProvider>
        </LanguageProvider>
      </ThemeProvider>
    </WouterRouter>
  );
}

export default App;
