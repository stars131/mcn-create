"use client";

import { create } from "zustand";

export interface WorkspaceSummary {
  id: string;
  name: string;
  currentPlan: string;
}

interface WorkspaceState {
  currentWorkspaceId?: string;
  workspaces: WorkspaceSummary[];
  setCurrentWorkspaceId: (workspaceId: string) => void;
  setWorkspaceSnapshot: (snapshot: { currentWorkspaceId: string; workspaces: WorkspaceSummary[] }) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspaceId: undefined,
  workspaces: [],
  setCurrentWorkspaceId: (workspaceId) => set({ currentWorkspaceId: workspaceId }),
  setWorkspaceSnapshot: (snapshot) =>
    set({
      currentWorkspaceId: snapshot.currentWorkspaceId,
      workspaces: snapshot.workspaces
    })
}));
