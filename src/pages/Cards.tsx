import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, Lock, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";

const Cards = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <h1 className="text-2xl font-display font-bold">Cards</h1>

        {/* Virtual Card */}
        <div className="relative rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 lg:p-8 overflow-hidden max-w-md">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <p className="text-xs text-primary-foreground/70 mb-6">NexusBank Virtual Card</p>
          <p className="text-lg font-mono tracking-widest mb-4">•••• •••• •••• 4829</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-primary-foreground/70">Card Holder</p>
              <p className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-primary-foreground/70">Expires</p>
              <p className="text-sm font-medium">12/28</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-warning/10 text-warning">
                <Snowflake className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Freeze Card</p>
                <p className="text-xs text-muted-foreground">Temporarily disable your card</p>
              </div>
              <Button variant="outline" size="sm">Freeze</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <Lock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Change PIN</p>
                <p className="text-xs text-muted-foreground">Update your card PIN</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Cards;
