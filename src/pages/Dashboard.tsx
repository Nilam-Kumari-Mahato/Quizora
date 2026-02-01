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
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const myQuizzes = useQuery(api.quizzes.getMyQuizzes);
  const deleteQuiz = useMutation(api.quizzes.deleteQuiz);

  const isLoading = myQuizzes === undefined;
  const quizzes = myQuizzes ?? [];
  const isEmpty = !isLoading && quizzes.length === 0;

  return (
    <SidebarProvider >
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 ">
          <div className="bg-muted/30 min-h-[100vh] flex-1 rounded-md md:min-h-min ">
            <div className="flex flex-row w-full justify-end px-4 md:px-8 lg:px-32">
              <Button variant="ghost" onClick={() => navigate('/join')} className="hover:bg-primary-glow rounded-full m-1 mt-5 px-5 dark:text-zinc-300 dark:hover:bg-muted">
                Join Quiz
              </Button>

              {(!isLoading && quizzes.length > 0) && (
                <Button onClick={() => navigate('/create-quiz')} className="text-xs lg:text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:brightness-90 hover:text-black rounded-full m-2 mt-5 px-3 py-2 lg:p-5 ">
                  <Plus className="h-4 w-4" />
                  Create Quiz
                </Button>
              )}
            </div>
            <div className="px-4 md:px-8 lg:px-32 py-3 h-screen">
              {/* Column Labels - only when list exists */}
              {(!isLoading && quizzes.length > 0) && (
                <div className="hidden md:flex justify-between px-3 mb-3 text-sm text-muted-foreground/70">
                  <p>Details</p>
                  <p>Created</p>
                  <p>More</p>
                </div>
              )}

              {isLoading ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  Loading your quizzes...
                </Card>
              ) : isEmpty ? (
                <Card className="p-6 md:p-8">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-base md:text-lg font-semibold dark:text-zinc-200">
                      No quizzes yet
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Create your first quiz to get started.
                    </p>
                    <div className="mt-3">
                      <Button
                        onClick={() => navigate("/create-quiz")}
                        className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:brightness-90 hover:text-black rounded-full"
                      >
                        <Plus className="h-4 w-4" />
                        Create Quiz
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col gap-3 md:gap-4">
                  {quizzes.map((q: any) => (
                    <Card key={String(q._id)} className="p-3 md:p-4">
                      {/* Grid Layout - Mobile: 2 columns, Tablet+: 3 columns */}
                      <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_1fr] gap-3 md:gap-4 items-center">

                        {/* Details Column */}
                        <div className="min-w-0">
                          <h3 className="text-base md:text-lg font-bold truncate dark:text-zinc-200">{q.title}</h3>
                          {q.description && (
                            <p className="text-xs md:text-sm text-muted-foreground mt-1">
                              {q.description.length > 12 ? `${q.description.substring(0, 12)}...` : q.description}
                            </p>
                          )}
                        </div>

                        {/* Created Column - Hidden on mobile */}
                        <div className="hidden md:flex flex-row items-center justify-center text-sm text-muted-foreground min-w-0">
                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{formatDistanceToNow(new Date(q._creationTime))} ago</span>
                        </div>

                        {/* Actions Column */}
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 rounded hover:bg-muted">
                                <MoreVertical className="h-5 w-5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => navigate(`/create-quiz?quizId=${String(q._id)}`)} className="dark:text-zinc-300">
                                <Edit className="dark:text-zinc-500 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => navigate(`/quiz/${String(q._id)}`)} className="dark:text-zinc-300">
                                <Play className="dark:text-zinc-500 h-4 w-4" /> Run
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={async () => {
                                if (!confirm(`Delete quiz "${q.title}"? This cannot be undone.`)) return;
                                try {
                                  await deleteQuiz({ id: q._id });
                                  toast({ title: "Deleted", description: "Quiz deleted." });
                                } catch (err: any) {
                                  toast({ title: "Error", description: `Failed to delete quiz: ${err.message}`, variant: "destructive" });
                                }
                              }} className="dark:text-zinc-300">
                                <Trash2 className="dark:text-zinc-500 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </SidebarInset>
    </SidebarProvider>
  );
}
