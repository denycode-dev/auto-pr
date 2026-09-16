import {
  BookOpenCheck,
  FolderGit2,
  GitPullRequest,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  ShieldAlert,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Review Workspace",
    items: [
      {
        id: "overview",
        title: "Overview",
        url: "/dashboard/overview",
        icon: LayoutDashboard,
      },
      {
        id: "pull-requests",
        title: "Pull Requests",
        url: "/dashboard/pull-requests",
        icon: GitPullRequest,
      },
    ],
  },
  {
    id: 2,
    label: "Standar & Kualitas",
    items: [
      {
        id: "sops",
        title: "Coding SOPs",
        url: "/dashboard/sops",
        icon: BookOpenCheck,
      },
      {
        id: "repositories",
        title: "Repositories",
        url: "/dashboard/repositories",
        icon: FolderGit2,
      },
    ],
  },
  {
    id: 3,
    label: "Sistem",
    items: [
      {
        id: "settings",
        title: "Integrasi & Settings",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];
