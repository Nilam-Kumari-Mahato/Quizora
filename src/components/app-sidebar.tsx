import * as React from "react"
import { useNavigate } from "react-router-dom";
import {
  AudioWaveform,
  BookA,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  NotebookPen,
  PenBox,
  PenLine,
  PenOffIcon,
  PenSquareIcon,
  PercentSquare,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import TeamSwitcher from "@/components/team-switcher"
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Quizzes",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      // items will be filled dynamically from the Convex DB
      items: [],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Fetch quizzes created by the currently authenticated user
  const myQuizzes = useQuery(api.quizzes.getMyQuizzes);
  const navigate = useNavigate();
  // Map the quizzes to nav items; when not loaded yet, keep the static placeholder
  const quizItems =
    myQuizzes && myQuizzes.length > 0
      ? myQuizzes.map((q: any) => ({ title: q.title || "Untitled", url: `/quiz/${String(q._id)}` }))
      : [
        { title: "History", url: "#" },
        { title: "Starred", url: "#" },
      ];

  const navMain = [
    {
      title: "Quizzes",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: quizItems,
    },
  ];
const attempts = useQuery(api.sessions.getMyAttempts);
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button
                  onClick={() => navigate("/my-attempts")}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <BookOpen />
                  <span>My Attempts</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}


