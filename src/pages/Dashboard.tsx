import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Plus, Trash2, MoreVertical, Edit, Play, Clock } from "lucide-react"
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns"; // Helper for "2 days ago"

export default function Dashboard() {
  // FIX: Renamed 'Navigate' to 'navigate' to follow conventions
  const navigate = useNavigate(); 
  const { toast } = useToast();

  const myQuizzes = useQuery(api.quizzes.getMyQuizzes);
  const deleteQuiz = useMutation(api.quizzes.deleteQuiz);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex flex-row w-full justify-end">
            <Button variant="outline" onClick={() => navigate('/join')} className="text-primary hover:bg-primary/90 rounded-md border border-primary-foreground-30 mr-32 mt-5 p-5 px-7">
                        Join Quiz
                      </Button>
          </div>
    

            <div className="bg-muted/30 min-h-[100vh] flex-1 rounded-md md:min-h-min ">
            <div className="flex flex-row w-full justify-end">
            <Button onClick={() => navigate('/create-quiz')} className="bg-primary text-primary-foreground hover:bg-background/80 hover:text-primary rounded-full border border-primary-foreground-30 mr-32 mt-5 p-5">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Quiz
                      </Button>
          </div>
            <div className="px-32 py-3 h-screen">
            <div className="flex flex-row justify-between m-5 text-muted-foreground/70">
              <p>Quiz details</p>
              <p>Created</p>
              <p>More actions</p>
            </div>

            <div className="flex flex-col gap-4 ">
              {(myQuizzes || []).map((q: any) => (
                <Card key={String(q._id)} className="p-4 flex flex-col justify-between">
                  
                    <div className="flex justify-between items-center">
                      <div>
                      <h3 className="text-lg font-bold line-clamp-1">{q.title}</h3>
                         {q.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{q.description}</p>}
                           </div>

                           <div className="flex flex-row items-center text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                    <span>{formatDistanceToNow(new Date(q._creationTime))}</span>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded hover:bg-muted/30">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => navigate(`/create-quiz?quizId=${String(q._id)}`)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => navigate(`/quiz/${String(q._id)}`)}>
                            <Play className="mr-2 h-4 w-4" /> Run
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={async () => {
                            if (!confirm(`Delete quiz "${q.title}"? This cannot be undone.`)) return;
                            try {
                              await deleteQuiz({ id: q._id });
                              toast({ title: "Deleted", description: "Quiz deleted." });
                            } catch (err: any) {
                              toast({ title: "Error", description: `Failed to delete quiz: ${err.message}`, variant: "destructive" });
                            }
                          }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                    </div>
                                  
                </Card>
              ))}
            </div>

            </div>
            </div>

            </div>

      </SidebarInset>
    </SidebarProvider>
  );
}
