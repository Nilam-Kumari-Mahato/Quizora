import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Layout, Trophy, BookOpen, Clock, Mail, User, ShieldCheck } from "lucide-react";

export default function Profile() {
  const { user } = useUser();
  const myQuizzes = useQuery(api.quizzes.getMyQuizzes);
  const quizCount = myQuizzes?.length ?? 0;

  // Mock stats for demonstration
  const stats = [
    { label: "Quizzes Created", value: quizCount, icon: BookOpen, color: "text-blue-500" },
    { label: "Quizzes Played", value: 12, icon: Play, color: "text-green-500" },
    { label: "High Score", value: "2,450", icon: Trophy, color: "text-yellow-500" },
  ];

  const activities = [
    { title: "Created 'Science Trivia'", time: "2 hours ago", type: "create" },
    { title: "Played 'World Capitals'", time: "Yesterday", type: "play" },
    { title: "Hosted 'Math Quiz'", time: "2 days ago", type: "host" },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6 lg:p-10 max-w-6xl mx-auto w-full">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black tracking-tight dark:text-zinc-100">Profile</h1>
            <p className="text-muted-foreground">Manage your account and view your statistics.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-12">
            {/* Profile Card */}
            <Card className="md:col-span-4 p-6 flex flex-col items-center text-center gap-4 hover:shadow-[0_0_30px_rgba(251,146,60,0.3)] hover:scale-[1.02] transition-all duration-500 border-2 hover:border-primary/40 bg-card/50 backdrop-blur-sm group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-400 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                <Avatar className="h-24 w-24 border-4 border-background relative">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback>{user?.firstName?.[0] ?? "U"}</AvatarFallback>
                </Avatar>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold dark:text-zinc-100">{user?.fullName}</h2>
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {user?.primaryEmailAddress?.emailAddress}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="rounded-full px-3 bg-primary/10 text-primary border-primary/20">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </Card>

            {/* Stats Section */}
            <div className="md:col-span-8 grid gap-4 sm:grid-cols-3">
              {stats.map((stat, i) => (
                <Card 
                  key={i} 
                  className="p-6 flex flex-col justify-between gap-4 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)] hover:scale-[1.04] transition-all duration-500 border-2 hover:border-orange-300/40 bg-card/50 backdrop-blur-sm group"
                >
                  <div className={`p-2 rounded-lg bg-muted/50 w-fit ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold dark:text-zinc-100">{stat.value}</p>
                  </div>
                </Card>
              ))}

              {/* Recent Activity Card */}
              <Card className="sm:col-span-3 p-6 hover:shadow-[0_0_25px_rgba(251,146,60,0.15)] transition-all duration-500 border-2 hover:border-primary/20 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-bold text-lg dark:text-zinc-100">Recent Activity</h3>
                </div>
                <div className="space-y-6">
                  {activities.map((activity, i) => (
                    <div key={i} className="flex items-center justify-between group/row">
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-primary group-hover/row:scale-150 transition-transform" />
                        <div>
                          <p className="text-sm font-medium dark:text-zinc-300 group-hover/row:text-primary transition-colors">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider opacity-60 group-hover/row:opacity-100 transition-opacity">
                        {activity.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Helper to provide the 'Play' icon since it wasn't in the imports for the stat map
import { Play } from "lucide-react";
